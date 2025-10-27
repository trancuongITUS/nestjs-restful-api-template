# Line Endings Setup Guide

## Overview

This project uses **LF (Line Feed)** line endings for all text files to ensure consistency across different operating systems (Windows, macOS, Linux).

## Configuration Files

The following files enforce consistent line endings:

1. **`.prettierrc`** - Prettier configuration with `"endOfLine": "lf"`
2. **`.gitattributes`** - Git configuration to normalize line endings
3. **`.editorconfig`** - Editor configuration for cross-IDE consistency

## Initial Setup on New Computer

When cloning this project on a new computer, follow these steps:

### Step 1: Configure Git (One-time setup)

```bash
# Set Git to convert CRLF to LF on commit, but keep LF on checkout
git config --global core.autocrlf input
```

**Note:** 
- On Windows, use `input` (not `true`) to prevent Git from converting LF to CRLF
- On macOS/Linux, this is usually the default

### Step 2: Re-checkout Files with Correct Line Endings

After cloning or pulling the latest changes:

```bash
# Remove all files from Git's index (doesn't delete actual files)
git rm --cached -r .

# Reset the index to match the repository
git reset --hard

# This will re-checkout all files with the correct line endings based on .gitattributes
```

### Step 3: Configure Your Editor (VS Code/Cursor)

Add these settings to your **User Settings** or **Workspace Settings**:

```json
{
  "files.eol": "\n",
  "files.insertFinalNewline": true,
  "files.trimTrailingWhitespace": true,
  "editor.formatOnSave": true,
  "prettier.endOfLine": "lf"
}
```

**How to access settings in Cursor/VS Code:**
- Press `Ctrl+,` (Windows/Linux) or `Cmd+,` (macOS)
- Search for "eol" and set to `\n`
- Or edit `settings.json` directly

### Step 4: Install EditorConfig Extension (Recommended)

Install the **EditorConfig** extension for your IDE:
- VS Code/Cursor: Search "EditorConfig for VS Code" in extensions

This ensures the `.editorconfig` file is respected.

## Fixing Line Ending Issues

If you see `Delete ␍ eslint(prettier/prettier)` errors:

### Quick Fix (Current File)

1. Click on `CRLF` in the bottom-right status bar
2. Select `LF`
3. Save the file

### Fix All Files

Run Prettier to fix all files at once:

```bash
npm run format
# or
npx prettier --write .
```

## Verification

Check if files have correct line endings:

### On Windows (PowerShell)

```powershell
# Check a specific file
Get-Content src/main.ts -Raw | Select-String "`r`n"
# If no output = LF (correct)
# If output shows matches = CRLF (needs fixing)
```

### On macOS/Linux

```bash
# Check a specific file
file src/main.ts
# Should show: "ASCII text" (not "ASCII text, with CRLF line terminators")
```

### Check Git Config

```bash
# Check current setting
git config core.autocrlf
# Should return: input (or false)
```

## Why LF?

- **Cross-platform consistency**: Works the same on Windows, macOS, and Linux
- **Git best practice**: Most open-source projects use LF
- **Smaller file sizes**: LF is one byte (`\n`), CRLF is two bytes (`\r\n`)
- **Unix/Linux standard**: Servers typically run on Linux
- **Modern tooling**: Most development tools expect LF

## Troubleshooting

### Issue: Still seeing CRLF errors after setup

**Solution:**
```bash
# 1. Check Git config
git config core.autocrlf  # Should be 'input' or 'false'

# 2. If it's 'true', change it
git config --global core.autocrlf input

# 3. Re-checkout files
git rm --cached -r .
git reset --hard

# 4. Run Prettier
npx prettier --write .
```

### Issue: Files keep reverting to CRLF

**Solution:**
- Check if another tool (e.g., IDE plugin) is converting line endings
- Ensure `.editorconfig` extension is installed and enabled
- Verify `files.eol` setting in VS Code/Cursor is set to `\n`

### Issue: Some files need CRLF (Windows scripts)

**Solution:**
- `.gitattributes` already handles this for `.bat`, `.cmd`, `.ps1` files
- These files will correctly use CRLF

## Team Collaboration

When working in a team:

1. **Share this guide** with all team members
2. **Ensure everyone runs** the initial setup steps
3. **Commit the config files**: `.prettierrc`, `.gitattributes`, `.editorconfig`
4. **Add to onboarding docs**: Include line endings setup in new developer onboarding

## References

- [EditorConfig](https://editorconfig.org/)
- [Prettier - End of Line](https://prettier.io/docs/en/options.html#end-of-line)
- [Git - gitattributes](https://git-scm.com/docs/gitattributes)
- [GitHub - Dealing with line endings](https://docs.github.com/en/get-started/getting-started-with-git/configuring-git-to-handle-line-endings)

