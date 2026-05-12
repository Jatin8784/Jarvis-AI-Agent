import { execSync } from 'child_process'
import os from 'os'

// Get Windows user settings and preferences
export function getWindowsSettings(): string {
  try {
    const userInfo = os.userInfo()
    const settings: any = {
      user: {
        username: userInfo.username,
        fullName: getFullName(),
        homeDirectory: userInfo.homedir,
        shell: userInfo.shell || 'N/A',
      },
      system: {
        computerName: os.hostname(),
        platform: os.platform(),
        osType: os.type(),
        osRelease: os.release(),
        architecture: os.arch(),
      },
      regional: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: Intl.DateTimeFormat().resolvedOptions().locale,
        dateFormat: new Date().toLocaleDateString(),
        timeFormat: new Date().toLocaleTimeString(),
      },
      environment: getEnvironmentVariables(),
    }

    return formatSettings(settings)
  } catch (err: any) {
    return `Error reading Windows settings: ${err.message}`
  }
}

// Get user's full name from Windows
function getFullName(): string {
  try {
    if (process.platform === 'win32') {
      const result = execSync('wmic useraccount where name="%USERNAME%" get fullname', { 
        encoding: 'utf8',
        timeout: 5000 
      })
      const lines = result.split('\n').filter(line => line.trim() && !line.includes('FullName'))
      return lines[0]?.trim() || os.userInfo().username
    }
    return os.userInfo().username
  } catch (err) {
    return os.userInfo().username
  }
}

// Get relevant environment variables
function getEnvironmentVariables(): any {
  const env = process.env
  return {
    username: env.USERNAME || env.USER,
    userProfile: env.USERPROFILE || env.HOME,
    computerName: env.COMPUTERNAME || env.HOSTNAME,
    logonServer: env.LOGONSERVER,
    userDomain: env.USERDOMAIN,
    appData: env.APPDATA,
    localAppData: env.LOCALAPPDATA,
    temp: env.TEMP,
    programFiles: env.PROGRAMFILES,
    systemRoot: env.SYSTEMROOT,
    pathExt: env.PATHEXT,
  }
}

// Format settings for display
function formatSettings(settings: any): string {
  return `**Windows Settings & User Profile**

**User Information:**
- Full Name: ${settings.user.fullName}
- Username: ${settings.user.username}
- Home Directory: ${settings.user.homeDirectory}
- Shell: ${settings.user.shell}

**Computer Information:**
- Computer Name: ${settings.system.computerName}
- Platform: ${settings.system.platform}
- OS Type: ${settings.system.osType}
- OS Release: ${settings.system.osRelease}
- Architecture: ${settings.system.architecture}

**Regional Settings:**
- Timezone: ${settings.regional.timezone}
- Locale: ${settings.regional.locale}
- Date Format: ${settings.regional.dateFormat}
- Time Format: ${settings.regional.timeFormat}

**Environment:**
- User Profile: ${settings.environment.userProfile}
- Computer Name: ${settings.environment.computerName}
- Domain: ${settings.environment.userDomain || 'N/A'}
- Logon Server: ${settings.environment.logonServer || 'N/A'}
- AppData: ${settings.environment.appData}
- Local AppData: ${settings.environment.localAppData}
- Temp: ${settings.environment.temp}
- Program Files: ${settings.environment.programFiles}
- System Root: ${settings.environment.systemRoot}`
}

// Get specific Windows Registry value
export function getRegistryValue(keyPath: string, valueName: string): string {
  try {
    if (process.platform !== 'win32') {
      return 'Registry access is only available on Windows'
    }

    const command = `reg query "${keyPath}" /v "${valueName}"`
    const result = execSync(command, { encoding: 'utf8', timeout: 5000 })
    
    // Parse the output
    const lines = result.split('\n')
    for (const line of lines) {
      if (line.includes(valueName)) {
        const parts = line.trim().split(/\s+/)
        return parts.slice(2).join(' ')
      }
    }
    
    return 'Value not found'
  } catch (err: any) {
    return `Error reading registry: ${err.message}`
  }
}

// Get Windows personalization settings
export function getPersonalizationSettings(): string {
  try {
    if (process.platform !== 'win32') {
      return 'Personalization settings only available on Windows'
    }

    const settings: any = {}

    // Try to get theme settings
    try {
      const themeResult = execSync('reg query "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize" /v AppsUseLightTheme', { 
        encoding: 'utf8',
        timeout: 5000 
      })
      settings.theme = themeResult.includes('0x0') ? 'Dark Mode' : 'Light Mode'
    } catch (e) {
      settings.theme = 'Unknown'
    }

    // Try to get wallpaper
    try {
      const wallpaperResult = execSync('reg query "HKCU\\Control Panel\\Desktop" /v Wallpaper', { 
        encoding: 'utf8',
        timeout: 5000 
      })
      const lines = wallpaperResult.split('\n')
      for (const line of lines) {
        if (line.includes('Wallpaper')) {
          const parts = line.trim().split(/\s+/)
          settings.wallpaper = parts.slice(2).join(' ')
          break
        }
      }
    } catch (e) {
      settings.wallpaper = 'Unknown'
    }

    return `**Windows Personalization Settings**

- Theme: ${settings.theme}
- Wallpaper: ${settings.wallpaper || 'Not set'}`
  } catch (err: any) {
    return `Error reading personalization settings: ${err.message}`
  }
}
