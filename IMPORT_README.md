# Book Import System

## Overview

The Book Import System allows you to import books from ONIX XML files into the Another Read database. The system supports both ONIX 3.0 reference tags and short tags formats, automatically parsing and extracting book metadata.

## Features

- ✅ **ONIX 3.0 Support**: Handles both reference tags and short tags formats
- ✅ **Automatic Parsing**: Extracts ISBNs, titles, authors, descriptions, prices, genres, and more
- ✅ **Duplicate Detection**: Automatically skips books that already exist in the database
- ✅ **Error Logging**: Comprehensive error tracking with detailed logs
- ✅ **File Management**: Automatically moves processed/failed files to appropriate folders
- ✅ **Admin Interface**: Web UI for managing imports and viewing logs

## Directory Structure

```
imports/
├── incoming/     # Drop XML files here for processing
├── processed/    # Successfully processed files are moved here
└── failed/       # Failed files are moved here
```

## Supported ONIX Formats

The system has been tested with:
- **APONIX** format (Andersen Press)
- **Penguin Random House** format

Both use ONIX 3.0 but with different tag styles (reference vs. short tags).

## How to Import Books

### Method 1: Using the Web Interface (Recommended)

1. Log in as an Admin user
2. Navigate to **Imports** in the sidebar
3. Place your ONIX XML files in the `imports/incoming` folder
4. Click **"Process Incoming Files"** button
5. View the import results and any errors

### Method 2: Programmatic Import

```typescript
import { processIncomingFiles } from '~/server/services/bookImport';

// Process all files in the incoming directory
const results = await processIncomingFiles();

console.log(`Processed ${results.length} files`);
results.forEach(result => {
  console.log(`${result.importedBooks} imported, ${result.skippedBooks} skipped, ${result.errorCount} errors`);
});
```

## Extracted Book Data

The parser extracts the following fields from ONIX XML:

| Field | Description | ONIX Source |
|-------|-------------|-------------|
| `isbn13` | ISBN-13 | ProductIDType 03 or 15 |
| `isbn10` | ISBN-10 | ProductIDType 02 |
| `title` | Book title | TitleDetail > TitleElement |
| `author` | Primary author | Contributor with role A01 |
| `description` | Book description | TextContent with TextType 03 |
| `publisher` | Publisher name | PublishingDetail > Publisher |
| `publicationDate` | Publication date | PublishingDate with role 01 |
| `price` | Price with currency | SupplyDetail > Price |
| `genre` | Main genre/category | Subject (BIC/BISAC) |
| `keywords` | Keywords | Subject with scheme 20 |
| `coverImageUrl` | Cover image URL | SupportingResource type 01 |

## Database Schema

### Import Logs Table

Tracks each import operation:

```typescript
{
  id: number;
  filename: string;
  filepath: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalBooks: number;
  importedBooks: number;
  skippedBooks: number;
  errorCount: number;
  importSource: string;  // e.g., 'APONIX', 'Penguin Random House'
  startedAt: Date;
  completedAt: Date;
  createdAt: Date;
}
```

### Import Errors Table

Logs detailed error information:

```typescript
{
  id: number;
  importLogId: number;
  bookIdentifier: string;  // ISBN or record reference
  errorType: 'parse_error' | 'validation_error' | 'database_error' | 'system_error';
  errorMessage: string;
  errorDetails: string;  // JSON with stack trace and context
  createdAt: Date;
}
```

## API Endpoints

### Process Files

```typescript
const result = await api.import.processFiles.mutate();
// Returns summary of all processed files
```

### Get Import Logs

```typescript
const logs = await api.import.getLogs.query();
// Returns all import history
```

### Get Import Details

```typescript
const details = await api.import.getLogDetails.query({ importLogId: 123 });
// Returns detailed log with errors
```

## Error Handling

The system handles various error scenarios:

1. **Parse Errors**: Invalid XML or unsupported ONIX format
2. **Validation Errors**: Missing required fields
3. **Database Errors**: Constraint violations, connection issues
4. **System Errors**: File system errors, unexpected exceptions

All errors are logged with:
- Error type classification
- Detailed error message
- Book identifier (ISBN if available)
- Full stack trace and context

## Example XML Files

Sample files are available in `imports/incoming/`:
- `example_APONIX.xml` - APONIX format with reference tags
- `example_Penguin.xml` - Penguin Random House format with short tags

## Troubleshooting

### Files not processing

1. Check file permissions on the `imports/` directory
2. Ensure files are valid XML
3. Check the import logs for error details

### Books being skipped

Books are skipped if they already exist in the database (matched by ISBN). This is intentional to prevent duplicates.

### Parse errors

If you encounter parse errors:
1. Validate the XML file structure
2. Check if it's a supported ONIX version (3.0)
3. Review the error details in the import log

## Development

### Adding Support for New ONIX Formats

To add support for a new ONIX format:

1. Add tag mappings to `ONIX_TAG_MAP` in `src/server/services/onixParser.ts`
2. Update `detectOnixSource()` to recognize the new format
3. Test with sample files

### Extending Extracted Fields

To extract additional fields:

1. Add the field to `ParsedBook` interface
2. Create an extraction function (e.g., `extractNewField()`)
3. Call it in `parseProduct()`
4. Update the database schema if needed

## Security

- Import functionality is restricted to **Admin users only**
- Files are validated before processing
- SQL injection is prevented through parameterized queries
- Error messages don't expose sensitive system information

## Performance

- Files are processed sequentially to avoid overwhelming the database
- Duplicate checking uses indexed ISBN lookups
- Large files (1000+ books) typically process in under 1 minute

## Future Enhancements

Potential improvements:
- [ ] Batch processing with progress indicators
- [ ] Scheduled automatic imports
- [ ] Email notifications for import completion
- [ ] Support for ONIX 2.1 format
- [ ] Book update/merge functionality
- [ ] Import preview before committing
