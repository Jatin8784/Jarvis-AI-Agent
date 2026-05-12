import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync, unlinkSync, rmSync } from 'fs'
import { join, dirname, resolve, extname, basename } from 'path'
import { homedir } from 'os'
import mammoth from 'mammoth'

// Common user directories to search
function getSearchPaths(filename: string): string[] {
  const home = homedir()
  const username = basename(home)
  const paths = [
    // Exact path if provided
    filename,
    // Current working directory
    resolve(process.cwd(), filename),
  ]
  
  // OneDrive paths (check these FIRST as they're most common on Windows)
  const oneDrivePaths = [
    join(home, 'OneDrive', 'Documents', filename),
    join(home, 'OneDrive', 'Desktop', filename),
    join(home, 'OneDrive', filename),
    join(home, 'OneDrive - Personal', 'Documents', filename),
    join(home, 'OneDrive - Personal', 'Desktop', filename),
  ]
  paths.push(...oneDrivePaths)
  
  // Local user folders
  const localPaths = [
    join(home, 'Documents', filename),
    join(home, 'Desktop', filename),
    join(home, 'Downloads', filename),
    join(home, filename),
  ]
  paths.push(...localPaths)
  
  // Add drive root searches for common drives
  const drives = ['C:', 'D:', 'E:']
  drives.forEach(drive => {
    paths.push(join(drive, '\\', filename))
    // OneDrive on different drives
    paths.push(join(drive, '\\Users', username, 'OneDrive', 'Documents', filename))
    paths.push(join(drive, '\\Users', username, 'OneDrive', 'Desktop', filename))
    // Local folders on different drives
    paths.push(join(drive, '\\Users', username, 'Documents', filename))
    paths.push(join(drive, '\\Users', username, 'Desktop', filename))
    paths.push(join(drive, '\\Users', username, 'Downloads', filename))
  })
  
  return paths
}

function findFile(filePath: string): string | null {
  // If it's an absolute path, just check if it exists
  if (filePath.includes(':') || filePath.startsWith('\\\\')) {
    const resolved = resolve(filePath)
    return existsSync(resolved) ? resolved : null
  }
  
  // Search in common locations
  const searchPaths = getSearchPaths(filePath)
  for (const path of searchPaths) {
    if (existsSync(path)) {
      console.log(`✅ Found file at: ${path}`)
      return path
    }
  }
  
  return null
}

export async function readFile(filePath: string): Promise<string> {
  try {
    // Try to find the file
    const resolved = findFile(filePath)
    
    if (!resolved) {
      const home = homedir()
      const username = basename(home)
      return `❌ File not found: "${filePath}"

I searched in these common locations:
• OneDrive Documents: ${join(home, 'OneDrive', 'Documents')}
• OneDrive Desktop: ${join(home, 'OneDrive', 'Desktop')}
• Local Documents: ${join(home, 'Documents')}
• Local Desktop: ${join(home, 'Desktop')}
• Downloads: ${join(home, 'Downloads')}
• Current directory: ${process.cwd()}

📁 **To find your file, try these steps:**

1. **Check OneDrive Documents (most common):**
   Ask me: "list files in C:\\Users\\${username}\\OneDrive\\Documents"
   
2. **Check local Documents:**
   Ask me: "list files in C:\\Users\\${username}\\Documents"
   
3. **Once you find it, provide the full path:**
   Example: "read C:\\Users\\${username}\\OneDrive\\Documents\\${basename(filePath)}"

💡 **Tip:** Your file might be in OneDrive if you see the cloud icon in File Explorer.`
    }

    const ext = extname(resolved).toLowerCase()
    
    // Handle Word documents (.docx)
    if (ext === '.docx') {
      try {
        const result = await mammoth.extractRawText({ path: resolved })
        const text = result.value
        const lines = text.split('\n').length
        return `File: ${resolved}\nType: Word Document (.docx)\nLines: ${lines}\n\n${text}`
      } catch (err: any) {
        return `Error reading Word document: ${err.message}`
      }
    }
    
    // Handle text files
    if (['.txt', '.md', '.json', '.csv', '.xml', '.html', '.css', '.js', '.ts', '.py', '.java', '.c', '.cpp', '.h', '.log', '.yml', '.yaml', '.ini', '.conf'].includes(ext)) {
      const content = readFileSync(resolved, 'utf8')
      const lines = content.split('\n').length
      return `File: ${resolved}\nType: Text file (${ext})\nLines: ${lines}\n\n${content}`
    }
    
    // Handle PDF (basic info only - full PDF reading requires more complex library)
    if (ext === '.pdf') {
      const stats = statSync(resolved)
      return `File: ${resolved}\nType: PDF Document\nSize: ${formatBytes(stats.size)}\n\nNote: PDF text extraction is not yet supported. The file exists and is ${formatBytes(stats.size)} in size.`
    }
    
    // Handle images
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext)) {
      const stats = statSync(resolved)
      return `File: ${resolved}\nType: Image (${ext})\nSize: ${formatBytes(stats.size)}\n\nNote: Image analysis is not yet supported. The file exists and is ${formatBytes(stats.size)} in size.`
    }
    
    // For other binary files
    const stats = statSync(resolved)
    return `File: ${resolved}\nType: Binary file (${ext})\nSize: ${formatBytes(stats.size)}\n\nThis appears to be a binary file. Only text files and .docx documents can be read directly.`
    
  } catch (err: any) {
    return `Error reading file: ${err.message}`
  }
}

export function writeFile(filePath: string, content: string): string {
  try {
    let resolved: string
    
    // If it's an absolute path (contains : or starts with \\), use it directly
    if (filePath.includes(':') || filePath.startsWith('\\\\')) {
      resolved = resolve(filePath)
    } else {
      // For relative paths or just filenames, prioritize OneDrive Documents
      const home = homedir()
      const username = basename(home)
      
      // Priority locations for creating new files
      const defaultLocations = [
        join(home, 'OneDrive', 'Documents'),           // OneDrive Documents (FIRST PRIORITY)
        join(home, 'OneDrive - Personal', 'Documents'), // OneDrive Personal variant
        join(home, 'Documents'),                        // Local Documents (fallback)
      ]
      
      // Find the first location that exists
      let targetDir = defaultLocations.find(dir => existsSync(dir))
      
      // If none exist, use OneDrive Documents as default (will be created)
      if (!targetDir) {
        targetDir = defaultLocations[0]
      }
      
      resolved = join(targetDir, filePath)
    }
    
    const dir = dirname(resolved)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    writeFileSync(resolved, content, 'utf8')
    
    const lines = content.split('\n').length
    return `✅ **File Created Successfully**

📄 **File:** ${basename(resolved)}
📁 **Path:** ${resolved}
💾 **Size:** ${content.length} bytes
📊 **Lines:** ${lines}

The file has been created in your Documents folder.`
  } catch (err: any) {
    return `Error writing file: ${err.message}`
  }
}

export function listDirectory(dirPath: string): string {
  try {
    const resolved = resolve(dirPath)
    if (!existsSync(resolved)) {
      return `Directory not found: ${resolved}`
    }

    const items = readdirSync(resolved)
    const details = items.map(item => {
      const fullPath = join(resolved, item)
      try {
        const stat = statSync(fullPath)
        const size = stat.isDirectory() ? 'DIR' : formatBytes(stat.size)
        const type = stat.isDirectory() ? '📁' : '📄'
        return `${type} ${item} (${size})`
      } catch {
        return `? ${item}`
      }
    })

    return `Directory: ${resolved}\n${details.length} items\n\n${details.join('\n')}`
  } catch (err: any) {
    return `Error listing directory: ${err.message}`
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`
}

export async function editFile(filePath: string, instructions: string): Promise<string> {
  try {
    // Find and read the file
    const resolved = findFile(filePath)
    
    if (!resolved) {
      return `❌ File not found: "${filePath}"\n\nPlease provide the full path to the file you want to edit.`
    }

    const ext = extname(resolved).toLowerCase()
    
    // Read current content
    let currentContent = ''
    
    if (ext === '.docx') {
      return `❌ Cannot edit Word documents (.docx) directly. Please convert to .txt first or specify what changes you need.`
    }
    
    // Read text files
    if (['.txt', '.md', '.json', '.csv', '.xml', '.html', '.css', '.js', '.ts', '.py', '.java', '.c', '.cpp', '.h', '.log', '.yml', '.yaml', '.ini', '.conf'].includes(ext)) {
      currentContent = readFileSync(resolved, 'utf8')
    } else {
      return `❌ Cannot edit binary files. Only text files can be edited.`
    }
    
    // Return current content and instructions for the AI to process
    return `📄 **File to Edit:** ${resolved}
📝 **Current Content:**
\`\`\`
${currentContent}
\`\`\`

📋 **Edit Instructions:** ${instructions}

**To complete the edit, I need you to:**
1. Apply the requested changes to the content above
2. Call write_file with the path: ${resolved}
3. Provide the complete new content (with your changes applied)

Would you like me to proceed with these changes?`
    
  } catch (err: any) {
    return `Error editing file: ${err.message}`
  }
}

export async function deleteFile(filePath: string): Promise<string> {
  try {
    console.log('🗑️ deleteFile called with:', filePath)
    
    // Try direct path first
    let resolved: string | null = null
    
    if (existsSync(filePath)) {
      resolved = resolve(filePath)
      console.log('✅ Found directly:', resolved)
    } else {
      // Try findFile
      resolved = findFile(filePath)
      console.log('🔍 findFile result:', resolved)
    }
    
    if (!resolved) {
      // Try to be more helpful - list similar files
      const fileName = basename(filePath)
      const searchPaths = getSearchPaths(fileName)
      const foundFiles: string[] = []
      
      for (const path of searchPaths) {
        if (existsSync(path)) {
          foundFiles.push(path)
        }
      }
      
      if (foundFiles.length > 0) {
        return `❌ File/Folder not found at specified location: "${filePath}"

However, I found these similar files:
${foundFiles.map(f => `  • ${f}`).join('\n')}

Please specify the exact path you want to delete.`
      }
      
      return `❌ File/Folder not found: "${filePath}"

Searched in common locations but could not find it.
Please provide the full path, for example:
C:\\Users\\jatin\\Documents\\filename.ext`
    }

    // Check if it's a file or directory
    const stats = statSync(resolved)
    console.log('📊 Stats:', { isDirectory: stats.isDirectory(), isFile: stats.isFile() })
    
    if (stats.isDirectory()) {
      // It's a directory - use recursive delete
      console.log('📁 Calling deleteDirectory for:', resolved)
      return await deleteDirectory(resolved)
    }
    
    // Get file info before deletion (works for ANY file type)
    const fileSize = formatBytes(stats.size)
    const fileName = basename(resolved)
    const fileExt = extname(resolved).toLowerCase()
    
    // Delete the file (works for ALL file types: .zip, .exe, .pdf, .mp4, etc.)
    console.log('🗑️ Deleting file:', resolved)
    unlinkSync(resolved)
    
    // Verify deletion
    if (existsSync(resolved)) {
      return `❌ **Failed to Delete File**

📄 **File:** ${fileName}
📁 **Path:** ${resolved}

The file still exists after deletion attempt. Possible reasons:
• File is open in another program
• Permission denied
• File is locked by Windows or OneDrive
• Antivirus is blocking deletion

Please close any programs using this file and try again.`
    }
    
    return `✅ **File Deleted Successfully**

📄 **File:** ${fileName}
${fileExt ? `📦 **Type:** ${fileExt}` : ''}
📁 **Path:** ${resolved}
💾 **Size:** ${fileSize}

The file has been permanently deleted from your computer.`
    
  } catch (err: any) {
    console.error('❌ Delete error:', err)
    return `Error deleting file: ${err.message}\n\nPath attempted: ${filePath}`
  }
}

export async function deleteDirectory(dirPath: string): Promise<string> {
  try {
    console.log('📁 deleteDirectory called with:', dirPath)
    
    // The path should already be resolved from deleteFile
    const resolved = resolve(dirPath)
    console.log('📂 Resolved path:', resolved)
    
    if (!existsSync(resolved)) {
      return `❌ Directory not found: "${resolved}"`
    }

    // Check if it's actually a directory
    const stats = statSync(resolved)
    if (!stats.isDirectory()) {
      return `❌ "${resolved}" is not a directory. Use delete_file for files.`
    }
    
    // Count items in directory
    const items = readdirSync(resolved)
    const itemCount = items.length
    const dirName = basename(resolved)
    
    console.log(`🗑️ Deleting directory: ${resolved} (${itemCount} items)`)
    
    // Delete the directory recursively
    rmSync(resolved, { recursive: true, force: true })
    
    // Verify deletion
    if (existsSync(resolved)) {
      return `❌ **Failed to Delete Directory**

📁 **Directory:** ${dirName}
📂 **Path:** ${resolved}

The directory still exists after deletion attempt. Possible reasons:
• Files inside are open in another program
• Permission denied
• Directory is locked by Windows or OneDrive
• Antivirus is blocking deletion

Please close any programs using files in this directory and try again.`
    }
    
    console.log('✅ Directory deleted successfully')
    
    return `✅ **Directory Deleted Successfully**

📁 **Directory:** ${dirName}
📂 **Path:** ${resolved}
📊 **Items deleted:** ${itemCount} files/folders

The directory and all its contents have been permanently deleted from your computer.`
    
  } catch (err: any) {
    console.error('❌ Delete directory error:', err)
    return `Error deleting directory: ${err.message}\n\nPath attempted: ${dirPath}`
  }
}

export async function appendText(filePath: string, textToAdd: string, options?: {
  position?: 'start' | 'end' | 'after' | 'before' | 'line'
  searchText?: string
  lineNumber?: number
}): Promise<string> {
  try {
    // Find the file
    const resolved = findFile(filePath)
    
    if (!resolved) {
      return `❌ File not found: "${filePath}"\n\nPlease provide the full path to the file you want to add text to.`
    }

    const ext = extname(resolved).toLowerCase()
    
    // Only support text files
    if (!['.txt', '.md', '.json', '.csv', '.xml', '.html', '.css', '.js', '.ts', '.py', '.java', '.c', '.cpp', '.h', '.log', '.yml', '.yaml', '.ini', '.conf'].includes(ext)) {
      return `❌ Cannot add text to this file type. Only text files are supported.`
    }
    
    // Read current content
    const currentContent = readFileSync(resolved, 'utf8')
    const lines = currentContent.split('\n')
    const currentLines = lines.length
    
    let newContent = ''
    let insertPosition = ''
    const position = options?.position || 'end'
    
    if (position === 'start') {
      // Add to beginning
      newContent = textToAdd + '\n' + currentContent
      insertPosition = 'Beginning of file'
      
    } else if (position === 'end') {
      // Add to end
      newContent = currentContent + (currentContent.endsWith('\n') ? '' : '\n') + textToAdd
      insertPosition = 'End of file'
      
    } else if (position === 'line' && options?.lineNumber !== undefined) {
      // Add at specific line number
      const lineNum = options.lineNumber
      
      if (lineNum < 1 || lineNum > lines.length + 1) {
        return `❌ Invalid line number: ${lineNum}. File has ${lines.length} lines. Use a number between 1 and ${lines.length + 1}.`
      }
      
      // Insert at line (1-based index)
      lines.splice(lineNum - 1, 0, textToAdd)
      newContent = lines.join('\n')
      insertPosition = `Line ${lineNum}`
      
    } else if (position === 'after' && options?.searchText) {
      // Add after specific text
      const searchText = options.searchText
      let found = false
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(searchText)) {
          lines.splice(i + 1, 0, textToAdd)
          found = true
          insertPosition = `After line ${i + 1}: "${lines[i].trim()}"`
          break
        }
      }
      
      if (!found) {
        return `❌ Could not find "${searchText}" in the file. Please check the text and try again.`
      }
      
      newContent = lines.join('\n')
      
    } else if (position === 'before' && options?.searchText) {
      // Add before specific text
      const searchText = options.searchText
      let found = false
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(searchText)) {
          lines.splice(i, 0, textToAdd)
          found = true
          insertPosition = `Before line ${i + 1}: "${lines[i + 1].trim()}"`
          break
        }
      }
      
      if (!found) {
        return `❌ Could not find "${searchText}" in the file. Please check the text and try again.`
      }
      
      newContent = lines.join('\n')
      
    } else {
      // Default to end
      newContent = currentContent + (currentContent.endsWith('\n') ? '' : '\n') + textToAdd
      insertPosition = 'End of file'
    }
    
    // Write back to file
    writeFileSync(resolved, newContent, 'utf8')
    
    const newLines = newContent.split('\n').length
    const addedLines = textToAdd.split('\n').length
    
    return `✅ **Text Added Successfully**

📄 **File:** ${basename(resolved)}
📁 **Path:** ${resolved}
📍 **Position:** ${insertPosition}
📊 **Lines added:** ${addedLines}
📊 **Total lines now:** ${newLines}

**Text added:**
\`\`\`
${textToAdd}
\`\`\`

The text has been added to your file.`
    
  } catch (err: any) {
    return `Error adding text to file: ${err.message}`
  }
}
