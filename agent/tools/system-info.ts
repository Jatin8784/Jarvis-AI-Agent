import os from 'os'

export function getSystemInfo(): string {
  const cpus = os.cpus()
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const userInfo = os.userInfo()

  return `**💻 System Information**

**User Profile:**
- Username: ${userInfo.username}
- Home Directory: ${userInfo.homedir}
- Shell: ${userInfo.shell || 'N/A'}

**Operating System:**
- Platform: ${os.platform()}
- Type: ${os.type()}
- Release: ${os.release()}
- Architecture: ${os.arch()}
- Hostname: ${os.hostname()}

**CPU:**
- Model: ${cpus[0]?.model}
- Cores: ${cpus.length}
- Speed: ${cpus[0]?.speed}MHz

**Memory:**
- Total: ${(totalMem / 1024 / 1024 / 1024).toFixed(1)}GB
- Used: ${(usedMem / 1024 / 1024 / 1024).toFixed(1)}GB (${((usedMem / totalMem) * 100).toFixed(0)}%)
- Free: ${(freeMem / 1024 / 1024 / 1024).toFixed(1)}GB

**System:**
- Uptime: ${(os.uptime() / 3600).toFixed(1)} hours
- Node.js: ${process.version}
- Temp Directory: ${os.tmpdir()}`
}
