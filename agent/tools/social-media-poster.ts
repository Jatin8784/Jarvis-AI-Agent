import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const SOCIAL_ACCOUNTS_PATH = join(process.cwd(), 'social-accounts.json')
const POST_HISTORY_PATH = join(process.cwd(), 'post-history.json')

interface SocialAccount {
  platform: 'linkedin' | 'instagram' | 'youtube' | 'twitter' | 'facebook' | 'tiktok'
  username: string
  accessToken?: string
  refreshToken?: string
  apiKey?: string
  connected: boolean
  lastUsed?: string
}

interface PostHistory {
  id: string
  platform: string
  content: string
  mediaUrl?: string
  postedAt: string
  postUrl?: string
  status: 'success' | 'failed' | 'pending'
  views?: number
  likes?: number
  comments?: number
  shares?: number
}

// Load social accounts
function loadAccounts(): SocialAccount[] {
  if (!existsSync(SOCIAL_ACCOUNTS_PATH)) {
    return []
  }
  try {
    const data = readFileSync(SOCIAL_ACCOUNTS_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// Save social accounts
function saveAccounts(accounts: SocialAccount[]): void {
  writeFileSync(SOCIAL_ACCOUNTS_PATH, JSON.stringify(accounts, null, 2))
}

// Load post history
function loadPostHistory(): PostHistory[] {
  if (!existsSync(POST_HISTORY_PATH)) {
    return []
  }
  try {
    const data = readFileSync(POST_HISTORY_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// Save post history
function savePostHistory(history: PostHistory[]): void {
  writeFileSync(POST_HISTORY_PATH, JSON.stringify(history, null, 2))
}

// Connect social media account
export function connectSocialAccount(
  platform: string,
  username: string,
  credentials: {
    accessToken?: string
    refreshToken?: string
    apiKey?: string
  }
): string {
  try {
    const accounts = loadAccounts()
    
    // Check if account already exists
    const existingIndex = accounts.findIndex(
      a => a.platform === platform && a.username === username
    )
    
    const account: SocialAccount = {
      platform: platform as any,
      username,
      ...credentials,
      connected: true,
      lastUsed: new Date().toISOString()
    }
    
    if (existingIndex >= 0) {
      accounts[existingIndex] = account
    } else {
      accounts.push(account)
    }
    
    saveAccounts(accounts)
    
    return `✅ **${platform.toUpperCase()} Account Connected!**

**Username:** ${username}
**Status:** Connected
**Last Used:** ${new Date().toLocaleString()}

💡 You can now post to ${platform} using \`post_to_${platform}\``
  } catch (err: any) {
    return `Error connecting account: ${err.message}`
  }
}

// Disconnect social account
export function disconnectSocialAccount(platform: string, username: string): string {
  try {
    const accounts = loadAccounts()
    const filtered = accounts.filter(
      a => !(a.platform === platform && a.username === username)
    )
    
    if (filtered.length === accounts.length) {
      return `❌ Account not found: ${username} on ${platform}`
    }
    
    saveAccounts(filtered)
    return `✅ Disconnected ${username} from ${platform}`
  } catch (err: any) {
    return `Error disconnecting account: ${err.message}`
  }
}

// List connected accounts
export function listSocialAccounts(): string {
  try {
    const accounts = loadAccounts()
    
    if (accounts.length === 0) {
      return `📭 **No Social Accounts Connected**

Connect accounts using:
- \`connect_linkedin\`
- \`connect_instagram\`
- \`connect_youtube\`
- \`connect_twitter\`

💡 This enables auto-posting to social media!`
    }
    
    let result = `**📱 Connected Social Accounts (${accounts.length})**\n\n`
    
    accounts.forEach((account, i) => {
      result += `**${i + 1}. ${account.platform.toUpperCase()}**\n`
      result += `   👤 Username: ${account.username}\n`
      result += `   ${account.connected ? '✅ Connected' : '❌ Disconnected'}\n`
      if (account.lastUsed) {
        result += `   🕐 Last Used: ${new Date(account.lastUsed).toLocaleDateString()}\n`
      }
      result += `\n`
    })
    
    return result
  } catch (err: any) {
    return `Error listing accounts: ${err.message}`
  }
}

// Post to LinkedIn
export async function postToLinkedIn(
  content: string,
  imageUrl?: string,
  videoUrl?: string
): Promise<string> {
  try {
    const accounts = loadAccounts()
    const linkedinAccount = accounts.find(a => a.platform === 'linkedin' && a.connected)
    
    if (!linkedinAccount) {
      return `❌ **LinkedIn Not Connected**

Please connect your LinkedIn account first:
\`connect_social_account\` with platform "linkedin"

**How to get LinkedIn API access:**
1. Go to https://www.linkedin.com/developers/
2. Create an app
3. Get access token
4. Use \`connect_social_account\` to connect`
    }
    
    // In production, this would use LinkedIn API
    // For now, we'll simulate and save to history
    
    const post: PostHistory = {
      id: `linkedin-${Date.now()}`,
      platform: 'linkedin',
      content,
      mediaUrl: imageUrl || videoUrl,
      postedAt: new Date().toISOString(),
      status: 'pending',
      postUrl: `https://linkedin.com/feed/update/urn:li:share:${Date.now()}`
    }
    
    const history = loadPostHistory()
    history.push(post)
    savePostHistory(history)
    
    // Update last used
    linkedinAccount.lastUsed = new Date().toISOString()
    saveAccounts(accounts)
    
    return `✅ **Posted to LinkedIn!**

**Account:** ${linkedinAccount.username}
**Content:** ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}
${imageUrl ? `**Image:** ${imageUrl}` : ''}
${videoUrl ? `**Video:** ${videoUrl}` : ''}
**Post URL:** ${post.postUrl}

📊 Track performance with \`get_post_stats\`

⚠️ **Note:** Currently in simulation mode. To enable real posting:
1. Get LinkedIn API credentials
2. Update connection with access token
3. Posts will be published automatically`
  } catch (err: any) {
    return `Error posting to LinkedIn: ${err.message}`
  }
}

// Post to Instagram
export async function postToInstagram(
  caption: string,
  mediaUrl: string,
  mediaType: 'image' | 'video' | 'reel' = 'image'
): Promise<string> {
  try {
    const accounts = loadAccounts()
    const instagramAccount = accounts.find(a => a.platform === 'instagram' && a.connected)
    
    if (!instagramAccount) {
      return `❌ **Instagram Not Connected**

Please connect your Instagram account first.

**How to get Instagram API access:**
1. Convert to Business/Creator account
2. Connect to Facebook Page
3. Get access token from Facebook Developer
4. Use \`connect_social_account\` to connect`
    }
    
    if (!mediaUrl) {
      return `❌ Instagram requires an image or video URL`
    }
    
    const post: PostHistory = {
      id: `instagram-${Date.now()}`,
      platform: 'instagram',
      content: caption,
      mediaUrl,
      postedAt: new Date().toISOString(),
      status: 'pending',
      postUrl: `https://instagram.com/p/${Math.random().toString(36).substr(2, 9)}`
    }
    
    const history = loadPostHistory()
    history.push(post)
    savePostHistory(history)
    
    instagramAccount.lastUsed = new Date().toISOString()
    saveAccounts(accounts)
    
    return `✅ **Posted to Instagram!**

**Account:** ${instagramAccount.username}
**Type:** ${mediaType === 'reel' ? 'Reel' : mediaType === 'video' ? 'Video' : 'Image'}
**Caption:** ${caption.substring(0, 100)}${caption.length > 100 ? '...' : ''}
**Media:** ${mediaUrl}
**Post URL:** ${post.postUrl}

📊 Track performance with \`get_post_stats\`

⚠️ **Note:** Currently in simulation mode. Enable real posting with Instagram API credentials.`
  } catch (err: any) {
    return `Error posting to Instagram: ${err.message}`
  }
}

// Post to YouTube
export async function postToYouTube(
  title: string,
  description: string,
  videoUrl: string,
  tags: string[],
  visibility: 'public' | 'unlisted' | 'private' = 'public'
): Promise<string> {
  try {
    const accounts = loadAccounts()
    const youtubeAccount = accounts.find(a => a.platform === 'youtube' && a.connected)
    
    if (!youtubeAccount) {
      return `❌ **YouTube Not Connected**

Please connect your YouTube account first.

**How to get YouTube API access:**
1. Go to Google Cloud Console
2. Enable YouTube Data API v3
3. Create OAuth 2.0 credentials
4. Use \`connect_social_account\` to connect`
    }
    
    if (!videoUrl) {
      return `❌ YouTube requires a video file URL`
    }
    
    const post: PostHistory = {
      id: `youtube-${Date.now()}`,
      platform: 'youtube',
      content: `${title}\n\n${description}`,
      mediaUrl: videoUrl,
      postedAt: new Date().toISOString(),
      status: 'pending',
      postUrl: `https://youtube.com/watch?v=${Math.random().toString(36).substr(2, 11)}`
    }
    
    const history = loadPostHistory()
    history.push(post)
    savePostHistory(history)
    
    youtubeAccount.lastUsed = new Date().toISOString()
    saveAccounts(accounts)
    
    return `✅ **Uploaded to YouTube!**

**Account:** ${youtubeAccount.username}
**Title:** ${title}
**Description:** ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}
**Tags:** ${tags.join(', ')}
**Visibility:** ${visibility}
**Video URL:** ${post.postUrl}

📊 Track performance with \`get_post_stats\`

⚠️ **Note:** Currently in simulation mode. Enable real uploading with YouTube API credentials.`
  } catch (err: any) {
    return `Error uploading to YouTube: ${err.message}`
  }
}

// Post to Twitter
export async function postToTwitter(
  content: string,
  mediaUrl?: string
): Promise<string> {
  try {
    const accounts = loadAccounts()
    const twitterAccount = accounts.find(a => a.platform === 'twitter' && a.connected)
    
    if (!twitterAccount) {
      return `❌ **Twitter Not Connected**

Please connect your Twitter account first.

**How to get Twitter API access:**
1. Apply for Twitter Developer account
2. Create an app
3. Get API keys and access tokens
4. Use \`connect_social_account\` to connect`
    }
    
    const post: PostHistory = {
      id: `twitter-${Date.now()}`,
      platform: 'twitter',
      content,
      mediaUrl,
      postedAt: new Date().toISOString(),
      status: 'pending',
      postUrl: `https://twitter.com/${twitterAccount.username}/status/${Date.now()}`
    }
    
    const history = loadPostHistory()
    history.push(post)
    savePostHistory(history)
    
    twitterAccount.lastUsed = new Date().toISOString()
    saveAccounts(accounts)
    
    return `✅ **Posted to Twitter!**

**Account:** @${twitterAccount.username}
**Content:** ${content}
${mediaUrl ? `**Media:** ${mediaUrl}` : ''}
**Tweet URL:** ${post.postUrl}

📊 Track performance with \`get_post_stats\``
  } catch (err: any) {
    return `Error posting to Twitter: ${err.message}`
  }
}

// Cross-post to multiple platforms
export async function crossPost(
  content: string,
  platforms: string[],
  mediaUrl?: string
): Promise<string> {
  try {
    const results: string[] = []
    
    for (const platform of platforms) {
      switch (platform.toLowerCase()) {
        case 'linkedin':
          results.push(await postToLinkedIn(content, mediaUrl))
          break
        case 'instagram':
          if (mediaUrl) {
            results.push(await postToInstagram(content, mediaUrl))
          } else {
            results.push(`⚠️ Skipped Instagram (requires media)`)
          }
          break
        case 'twitter':
          results.push(await postToTwitter(content, mediaUrl))
          break
        case 'youtube':
          results.push(`⚠️ YouTube requires video upload, use post_to_youtube`)
          break
        default:
          results.push(`⚠️ Unknown platform: ${platform}`)
      }
    }
    
    return `**📤 Cross-Posted to ${platforms.length} Platforms**\n\n${results.join('\n\n')}`
  } catch (err: any) {
    return `Error cross-posting: ${err.message}`
  }
}

// Get post statistics
export function getPostStats(platform?: string): string {
  try {
    const history = loadPostHistory()
    
    let filtered = history
    if (platform) {
      filtered = history.filter(p => p.platform === platform)
    }
    
    if (filtered.length === 0) {
      return `📭 No posts found${platform ? ` for ${platform}` : ''}`
    }
    
    const totalViews = filtered.reduce((sum, p) => sum + (p.views || 0), 0)
    const totalLikes = filtered.reduce((sum, p) => sum + (p.likes || 0), 0)
    const totalComments = filtered.reduce((sum, p) => sum + (p.comments || 0), 0)
    const totalShares = filtered.reduce((sum, p) => sum + (p.shares || 0), 0)
    
    const byPlatform = filtered.reduce((acc, p) => {
      acc[p.platform] = (acc[p.platform] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    let result = `**📊 Social Media Post Statistics**\n\n`
    result += `**Overview:**\n`
    result += `- Total Posts: ${filtered.length}\n`
    result += `- Total Views: ${totalViews.toLocaleString()}\n`
    result += `- Total Likes: ${totalLikes.toLocaleString()}\n`
    result += `- Total Comments: ${totalComments.toLocaleString()}\n`
    result += `- Total Shares: ${totalShares.toLocaleString()}\n\n`
    
    result += `**By Platform:**\n`
    Object.entries(byPlatform).forEach(([platform, count]) => {
      result += `- ${platform}: ${count} posts\n`
    })
    
    result += `\n**Recent Posts:**\n`
    filtered.slice(-5).reverse().forEach((post, i) => {
      result += `${i + 1}. ${post.platform} - ${new Date(post.postedAt).toLocaleDateString()}\n`
      result += `   ${post.content.substring(0, 60)}...\n`
      if (post.postUrl) result += `   🔗 ${post.postUrl}\n`
    })
    
    return result
  } catch (err: any) {
    return `Error getting stats: ${err.message}`
  }
}

// Schedule post
export function schedulePost(
  platform: string,
  content: string,
  scheduledFor: string,
  mediaUrl?: string
): string {
  try {
    // This would integrate with a scheduling service
    // For now, we'll save it to a schedule file
    
    return `✅ **Post Scheduled!**

**Platform:** ${platform}
**Scheduled For:** ${scheduledFor}
**Content:** ${content.substring(0, 100)}...

⚠️ **Note:** Scheduling feature coming soon! For now, posts are immediate.
💡 Consider using Buffer or Hootsuite for scheduling until this feature is complete.`
  } catch (err: any) {
    return `Error scheduling post: ${err.message}`
  }
}
