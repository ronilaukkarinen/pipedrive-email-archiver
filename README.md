# ✉️ Pipedrive email archiver

A Node.js tool to bulk archive emails in Pipedrive via their API, since the UI doesn't provide a batch archive feature.

<img width="760" height="595" alt="image" src="https://github.com/user-attachments/assets/e3c18155-779c-41d5-8639-0381fcc86082" />

## Features

- Fetches all email threads from your Pipedrive inbox
- Bulk archives unarchived emails
- Dry-run mode to preview what will be archived
- Interactive confirmation before archiving
- Progress tracking and statistics
- Colorful CLI output with clear status indicators

## Prerequisites

- Node.js 18+ installed
- Pipedrive account with API access
- API token from Pipedrive

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` and add your Pipedrive API token:
   ```
   PIPEDRIVE_API_TOKEN=your_api_token_here
   PIPEDRIVE_DOMAIN=yourcompany.pipedrive.com
   ```

   To get your API token:
   - Log in to Pipedrive
   - Go to Settings → Personal preferences → API
   - Copy your personal API token

## Usage

### Interactive mode (Default)
```bash
npm start
```
This will:
1. Fetch all email threads from your inbox
2. Show you a summary of archived/unarchived emails
3. Ask for confirmation before archiving
4. Archive all unarchived emails

### Dry run mode
Preview what will be archived without making changes:
```bash
npm run dry-run
# or
npm start -- --dry-run
```

### Skip confirmation
Archive without the confirmation prompt:
```bash
npm start -- --yes
# or
npm start -- -y
```

### Help
```bash
npm start -- --help
```

## How it works

The tool uses Pipedrive's Mail Threads API to:

1. Fetch all email threads from your inbox using pagination
2. Filter out already archived threads
3. Archive each unarchived thread individually
4. Provide real-time progress updates

## API endpoints used

- `GET /mailbox/mailThreads` - Fetch email threads
- `PUT /mailbox/mailThreads/{id}` - Archive individual threads

## Rate limiting

The tool includes a 100ms delay between archive operations to avoid hitting API rate limits.

## Troubleshooting

### "PIPEDRIVE_API_TOKEN not found"

Make sure you've created a `.env` file with your API token.

### "Failed to fetch email threads"

- Verify your API token is correct
- Check if your Pipedrive domain is set correctly in `.env`
- Ensure you have the necessary permissions in Pipedrive
