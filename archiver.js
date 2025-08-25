#!/usr/bin/env node

import axios from 'axios';
import dotenv from 'dotenv';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

dotenv.config();

class PipedriveEmailArchiver {
  constructor() {
    this.apiToken = process.env.PIPEDRIVE_API_TOKEN;
    this.domain = process.env.PIPEDRIVE_DOMAIN || 'api.pipedrive.com';
    this.baseUrl = `https://${this.domain}/api/v1`;

    if (!this.apiToken) {
      console.error(chalk.red('Error: PIPEDRIVE_API_TOKEN not found in .env file'));
      process.exit(1);
    }

    this.stats = {
      total: 0,
      archived: 0,
      alreadyArchived: 0,
      failed: 0
    };
  }

  async fetchMailThreads(start = 0, limit = 100) {
    const spinner = ora(`Fetching email threads (offset: ${start})...`).start();

    try {
      const response = await axios.get(`${this.baseUrl}/mailbox/mailThreads`, {
        params: {
          api_token: this.apiToken,
          start,
          limit,
          folder: 'inbox'
        }
      });

      spinner.succeed(`Fetched ${response.data.data?.length || 0} threads`);
      return response.data;
    } catch (error) {
      spinner.fail('Failed to fetch email threads');
      console.error(chalk.red('Error:', error.response?.data?.error || error.message));
      throw error;
    }
  }

  async archiveThread(threadId) {
    try {
      const response = await axios.put(
        `${this.baseUrl}/mailbox/mailThreads/${threadId}`,
        {
          archived_flag: 1
        },
        {
          params: {
            api_token: this.apiToken
          }
        }
      );

      if (response.data.success) {
        this.stats.archived++;
        return true;
      }

      this.stats.failed++;
      return false;
    } catch (error) {
      this.stats.failed++;
      console.error(chalk.red(`Failed to archive thread ${threadId}:`, error.response?.data?.error || error.message));
      return false;
    }
  }

  async getAllThreads() {
    const allThreads = [];
    let hasMore = true;
    let start = 0;
    const limit = 100;

    console.log(chalk.blue('\n📧 Fetching all email threads from Pipedrive...\n'));

    while (hasMore) {
      const data = await this.fetchMailThreads(start, limit);

      if (data.data && data.data.length > 0) {
        allThreads.push(...data.data);
        start += limit;

        if (!data.additional_data?.pagination?.more_items_in_collection) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    return allThreads;
  }

  displayThreadInfo(threads) {
    console.log(chalk.cyan('\n📊 Email thread summary:'));
    console.log(chalk.white(`Total threads found: ${threads.length}`));

    const unarchived = threads.filter(t => !t.archived_flag);
    const archived = threads.filter(t => t.archived_flag);

    console.log(chalk.yellow(`Unarchived: ${unarchived.length}`));
    console.log(chalk.gray(`Already archived: ${archived.length}`));

    if (unarchived.length > 0) {
      console.log(chalk.cyan('\n📝 Sample of unarchived threads:'));
      unarchived.slice(0, 5).forEach(thread => {
        const parties = thread.parties?.to?.[0]?.name || thread.parties?.from?.[0]?.name || 'Unknown';
        console.log(chalk.white(`  - ${thread.subject || 'No subject'} (${parties})`));
      });

      if (unarchived.length > 5) {
        console.log(chalk.gray(`  ... and ${unarchived.length - 5} more`));
      }
    }

    return unarchived;
  }

  async confirmArchive(threadCount) {
    if (process.argv.includes('--yes') || process.argv.includes('-y')) {
      return true;
    }

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to archive ${threadCount} email thread(s)?`,
        default: false
      }
    ]);

    return confirm;
  }

  async archiveAll(threads) {
    const isDryRun = process.argv.includes('--dry-run');

    if (isDryRun) {
      console.log(chalk.yellow('\n🔍 DRY RUN MODE - No changes will be made\n'));
      threads.forEach(thread => {
        const parties = thread.parties?.to?.[0]?.name || thread.parties?.from?.[0]?.name || 'Unknown';
        console.log(chalk.gray(`Would archive: ${thread.subject || 'No subject'} (${parties})`));
      });
      return;
    }

    const spinner = ora('Archiving threads...').start();
    this.stats.total = threads.length;

    for (let i = 0; i < threads.length; i++) {
      const thread = threads[i];
      spinner.text = `Archiving thread ${i + 1}/${threads.length}: ${thread.subject || 'No subject'}`;

      await this.archiveThread(thread.id);

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    spinner.succeed('Archiving complete!');
  }

  displayStats() {
    console.log(chalk.green('\n✅ Archive Results:'));
    console.log(chalk.white(`Total processed: ${this.stats.total}`));
    console.log(chalk.green(`Successfully archived: ${this.stats.archived}`));

    if (this.stats.failed > 0) {
      console.log(chalk.red(`Failed: ${this.stats.failed}`));
    }
  }

  async run() {
    try {
      console.log(chalk.bold.blue('\nPipedrive email archiver\n'));

      // Fetch all threads
      const allThreads = await this.getAllThreads();

      if (allThreads.length === 0) {
        console.log(chalk.yellow('\n📭 No email threads found in your inbox.'));
        return;
      }

      // Display thread information and filter unarchived
      const unarchivedThreads = this.displayThreadInfo(allThreads);

      if (unarchivedThreads.length === 0) {
        console.log(chalk.green('\n✅ All email threads are already archived!'));
        return;
      }

      // Confirm archiving
      const shouldArchive = await this.confirmArchive(unarchivedThreads.length);

      if (!shouldArchive) {
        console.log(chalk.yellow('\n❌ Archive cancelled by user.'));
        return;
      }

      // Archive threads
      await this.archiveAll(unarchivedThreads);

      // Display results
      this.displayStats();

    } catch (error) {
      console.error(chalk.red('\n❌ Fatal error:', error.message));
      process.exit(1);
    }
  }
}

// Parse command line arguments for filtering options
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    help: args.includes('--help') || args.includes('-h'),
    dryRun: args.includes('--dry-run'),
    yes: args.includes('--yes') || args.includes('-y')
  };

  if (options.help) {
    console.log(chalk.bold('\nPipedrive email archiver - Help\n'));
    console.log('Usage: npm start [options]\n');
    console.log('Options:');
    console.log('  --dry-run    Show what would be archived without making changes');
    console.log('  --yes, -y    Skip confirmation prompt');
    console.log('  --help, -h   Show this help message\n');
    console.log('Examples:');
    console.log('  npm start                 # Interactive mode');
    console.log('  npm start --dry-run       # Preview what will be archived');
    console.log('  npm start --yes           # Archive without confirmation\n');
    process.exit(0);
  }

  return options;
}

// Main execution
const options = parseArgs();
const archiver = new PipedriveEmailArchiver();
archiver.run();
