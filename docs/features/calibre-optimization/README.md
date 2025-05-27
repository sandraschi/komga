# Calibre Optimization for Komga

## Overview

This feature provides seamless integration and optimization for users who maintain their libraries in Calibre and want to use Komga as their reading platform. It includes tools to optimize the library structure, metadata, and file formats for better performance in Komga.

## Features

- **Automatic Library Conversion**: Convert Calibre libraries to Komga-optimized structure
- **Metadata Synchronization**: Keep metadata in sync between Calibre and Komga
- **Format Optimization**: Convert files to formats better suited for web reading
- **Series Management**: Automatically organize books into series based on Calibre metadata
- **Bulk Operations**: Process multiple books or entire libraries at once

## Getting Started

### Prerequisites

- Calibre installation (version 5.0 or later)
- Komga server (version 1.0.0 or later)
- Sufficient disk space for temporary files

### Installation

1. Install the Komga Calibre plugin:
   - Open Calibre
   - Go to Preferences > Plugins > Load plugin from file
   - Select the `komga_calibre_plugin.zip`
   - Restart Calibre

2. Configure the plugin:
   - Go to Preferences > Plugins > Komga
   - Enter your Komga server URL and credentials
   - Set your preferred optimization settings

## Usage

### Syncing a Single Book

1. Right-click on a book in Calibre
2. Select "Export to Komga"
3. Choose optimization options
4. Click "Export"

### Syncing Your Entire Library

1. Go to the Komga plugin in Calibre
2. Select "Sync Entire Library"
3. Configure sync options:
   - Convert formats (recommended)
   - Update metadata
   - Generate thumbnails
   - Clean up temporary files
4. Click "Start Sync"

### Optimization Options

#### Format Conversion

| Format | Recommended | Notes |
|--------|-------------|-------|
| EPUB   | ✅ Yes       | Best for text-based books |
| CBZ    | ✅ Yes       | Best for comics and manga |
| PDF    | ❌ No        | Convert to EPUB or CBZ |
| MOBI   | ❌ No        | Convert to EPUB |


#### Metadata Handling

- **Preserve Original Metadata**: Keep Calibre's metadata structure
- **Enhance with Komga**: Let Komga fetch additional metadata
- **Custom Mapping**: Define how Calibre fields map to Komga fields

#### File Structure

- **Flat Structure**: All files in one directory (simpler)
- **Hierarchical**: Organize by author/series (better for large libraries)
- **Calibre-Style**: Maintain Calibre's folder structure

## Best Practices

1. **Backup Your Library**
   Always create a backup before running bulk operations

2. **Test with a Small Sample**
   Try syncing a few books first to verify your settings

3. **Monitor Disk Space**
   Conversion can use significant temporary disk space

4. **Schedule During Off-Peak Hours**
   Large syncs can be resource-intensive

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Verify your Komga server URL and credentials
   - Check if your Komga user has the correct permissions

2. **Format Not Supported**
   - Some formats may require additional Calibre plugins
   - Try converting to a different format first

3. **Sync Stuck or Slow**
   - Check network connectivity
   - Try reducing batch size in settings
   - Check server logs for errors

### Logs

- Calibre plugin logs: `~/.config/calibre/plugins/komga_plugin.log`
- Komga server logs: Check your Komga installation logs

## Advanced Configuration

### Custom Format Conversion

You can create custom conversion profiles in Calibre:

1. Go to Preferences > Common Options > Output Options
2. Select the desired output format
3. Configure conversion settings
4. Save as a new profile
5. Select this profile in the Komga plugin settings

### Metadata Field Mapping

Customize how Calibre fields map to Komga metadata:

```json
{
  "title": "title",
  "authors": "authors.name",
  "series": "series.name",
  "series_index": "series.position",
  "tags": "tags.name",
  "comments": "summary",
  "published": "release_date"
}
```

## Performance Tips

1. **Disable Unnecessary Plugins**
   Temporarily disable other Calibre plugins during sync

2. **Adjust Batch Size**
   Smaller batches use less memory but take longer

3. **Use SSD Storage**
   Significantly improves sync performance

4. **Limit Concurrent Operations**
   Reduce the number of concurrent conversions if your system is struggling

## Future Enhancements

- Two-way sync between Komga and Calibre
- Support for more file formats
- Advanced duplicate detection
- Automated library maintenance

## Support

For additional help, please visit our [Discord server](https://discord.gg/TdRpkDu) or open an issue on GitHub.
