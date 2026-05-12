import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const CONTENT_DB_PATH = join(process.cwd(), 'content-library.json')
const CONTENT_SCHEDULE_PATH = join(process.cwd(), 'content-schedule.json')
const CONTENT_STATS_PATH = join(process.cwd(), 'content-stats.json')

interface ContentItem {
  id: string
  type: 'blog' | 'social' | 'video-script' | 'email' | 'ad-copy' | 'product-description'
  title: string
  content: string
  keywords: string[]
  platform?: string
  createdAt: string
  published: boolean
  publishedAt?: string
  url?: string
  views?: number
  engagement?: number
  earnings?: number
}

interface ContentSchedule {
  id: string
  contentId: string
  platform: string
  scheduledFor: string
  status: 'pending' | 'published' | 'failed'
  result?: string
}

interface ContentStats {
  totalContent: number
  published: number
  pending: number
  totalViews: number
  totalEngagement: number
  totalEarnings: number
  byType: Record<string, number>
  byPlatform: Record<string, number>
}

// Load content library
function loadContent(): ContentItem[] {
  if (!existsSync(CONTENT_DB_PATH)) {
    return []
  }
  try {
    const data = readFileSync(CONTENT_DB_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// Save content library
function saveContent(content: ContentItem[]): void {
  writeFileSync(CONTENT_DB_PATH, JSON.stringify(content, null, 2))
}

// Load schedule
function loadSchedule(): ContentSchedule[] {
  if (!existsSync(CONTENT_SCHEDULE_PATH)) {
    return []
  }
  try {
    const data = readFileSync(CONTENT_SCHEDULE_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// Save schedule
function saveSchedule(schedule: ContentSchedule[]): void {
  writeFileSync(CONTENT_SCHEDULE_PATH, JSON.stringify(schedule, null, 2))
}

// Generate blog post
export async function generateBlogPost(
  topic: string,
  keywords: string[],
  length: 'short' | 'medium' | 'long' = 'medium',
  tone: 'professional' | 'casual' | 'technical' | 'friendly' = 'professional'
): Promise<string> {
  try {
    const wordCount = length === 'short' ? 500 : length === 'medium' ? 1000 : 2000
    
    // Generate blog post content
    const title = `${topic.charAt(0).toUpperCase() + topic.slice(1)}: A Comprehensive Guide`
    
    const content = `# ${title}

## Introduction

${topic} is an important topic that many people are interested in. In this comprehensive guide, we'll explore everything you need to know about ${topic}.

## What is ${topic}?

${topic} refers to [detailed explanation here]. Understanding ${topic} is crucial because it impacts [relevant areas].

## Key Benefits of ${topic}

1. **Benefit 1**: [Explanation]
2. **Benefit 2**: [Explanation]
3. **Benefit 3**: [Explanation]

## How to Get Started with ${topic}

### Step 1: Understanding the Basics
[Detailed explanation]

### Step 2: Practical Implementation
[Detailed explanation]

### Step 3: Advanced Techniques
[Detailed explanation]

## Common Mistakes to Avoid

- Mistake 1: [Explanation]
- Mistake 2: [Explanation]
- Mistake 3: [Explanation]

## Best Practices

1. Always [best practice 1]
2. Make sure to [best practice 2]
3. Don't forget to [best practice 3]

## Tools and Resources

- Tool 1: [Description]
- Tool 2: [Description]
- Resource 1: [Description]

## Real-World Examples

### Example 1: [Title]
[Detailed case study]

### Example 2: [Title]
[Detailed case study]

## Conclusion

${topic} is essential for [summary]. By following the steps and best practices outlined in this guide, you'll be well on your way to mastering ${topic}.

**Keywords**: ${keywords.join(', ')}

---

*Target word count: ${wordCount} words*
*Tone: ${tone}*
*SEO optimized for: ${keywords.join(', ')}`

    // Save to content library
    const contentItems = loadContent()
    const newContent: ContentItem = {
      id: `blog-${Date.now()}`,
      type: 'blog',
      title,
      content,
      keywords,
      createdAt: new Date().toISOString(),
      published: false,
    }
    contentItems.push(newContent)
    saveContent(contentItems)

    return `✅ **Blog Post Generated!**

**Title:** ${title}
**Length:** ${length} (~${wordCount} words)
**Tone:** ${tone}
**Keywords:** ${keywords.join(', ')}
**ID:** ${newContent.id}

**Content Preview:**
${content.substring(0, 500)}...

📁 Saved to content library
💡 Use \`publish_content\` to publish this content
📊 Use \`list_content\` to see all your content`
  } catch (err: any) {
    return `Error generating blog post: ${err.message}`
  }
}

// Generate social media post
export async function generateSocialPost(
  topic: string,
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram',
  style: 'informative' | 'engaging' | 'promotional' | 'inspirational' = 'engaging'
): Promise<string> {
  try {
    let content = ''
    let maxLength = 280
    
    switch (platform) {
      case 'twitter':
        maxLength = 280
        content = `🚀 ${topic}

Here's what you need to know:

✅ Key point 1
✅ Key point 2
✅ Key point 3

Want to learn more? 👇

#${topic.replace(/\s+/g, '')} #Tips #Growth`
        break
        
      case 'linkedin':
        maxLength = 3000
        content = `${topic} - What You Need to Know

I've been working with ${topic} for a while now, and here are my key insights:

🔹 Insight 1: [Detailed explanation]
🔹 Insight 2: [Detailed explanation]
🔹 Insight 3: [Detailed explanation]

The biggest lesson I've learned? [Key takeaway]

What's your experience with ${topic}? Share in the comments!

#${topic.replace(/\s+/g, '')} #ProfessionalDevelopment #Learning`
        break
        
      case 'facebook':
        maxLength = 5000
        content = `📢 ${topic}

Hey everyone! I wanted to share some thoughts about ${topic}.

Here's what I've discovered:

1️⃣ [Point 1]
2️⃣ [Point 2]
3️⃣ [Point 3]

💡 Pro tip: [Helpful advice]

What do you think? Let me know in the comments!

#${topic.replace(/\s+/g, '')}`
        break
        
      case 'instagram':
        maxLength = 2200
        content = `✨ ${topic} ✨

Swipe to learn more! 👉

📌 Key Point 1
📌 Key Point 2
📌 Key Point 3

💬 Comment below with your thoughts!
❤️ Save this for later
📤 Share with someone who needs this

#${topic.replace(/\s+/g, '')} #Tips #Growth #Motivation`
        break
    }

    // Save to content library
    const contentItems = loadContent()
    const newContent: ContentItem = {
      id: `social-${platform}-${Date.now()}`,
      type: 'social',
      title: `${platform} post: ${topic}`,
      content,
      keywords: [topic, platform],
      platform,
      createdAt: new Date().toISOString(),
      published: false,
    }
    contentItems.push(newContent)
    saveContent(contentItems)

    return `✅ **${platform.toUpperCase()} Post Generated!**

**Topic:** ${topic}
**Platform:** ${platform}
**Style:** ${style}
**Max Length:** ${maxLength} characters
**ID:** ${newContent.id}

**Content:**
${content}

📁 Saved to content library
💡 Use \`schedule_content\` to schedule posting
📊 Character count: ${content.length}/${maxLength}`
  } catch (err: any) {
    return `Error generating social post: ${err.message}`
  }
}

// Generate video script
export async function generateVideoScript(
  topic: string,
  duration: number = 5,
  style: 'tutorial' | 'review' | 'vlog' | 'educational' = 'educational'
): Promise<string> {
  try {
    const script = `# Video Script: ${topic}

**Duration:** ${duration} minutes
**Style:** ${style}

---

## [0:00-0:15] HOOK
"Hey everyone! Today we're talking about ${topic}, and I'm going to show you something that will completely change how you think about this..."

## [0:15-0:30] INTRODUCTION
"I'm [Your Name], and in this video, we'll cover:
- Point 1
- Point 2
- Point 3

So let's dive right in!"

## [0:30-${Math.floor(duration * 0.7)}:00] MAIN CONTENT

### Section 1: [Topic Point 1]
[Detailed explanation with examples]

**B-Roll Ideas:**
- Visual 1
- Visual 2
- Screen recording

### Section 2: [Topic Point 2]
[Detailed explanation with examples]

**B-Roll Ideas:**
- Visual 1
- Visual 2

### Section 3: [Topic Point 3]
[Detailed explanation with examples]

## [${Math.floor(duration * 0.7)}:00-${Math.floor(duration * 0.9)}:00] KEY TAKEAWAYS

"So to recap, here are the main points:
1. [Key point 1]
2. [Key point 2]
3. [Key point 3]"

## [${Math.floor(duration * 0.9)}:00-${duration}:00] CALL TO ACTION

"If you found this helpful, make sure to:
- Like this video
- Subscribe for more content
- Comment below with your thoughts
- Check out my other videos on [related topic]

Thanks for watching, and I'll see you in the next one!"

---

**Production Notes:**
- Thumbnail idea: [Description]
- Title: "${topic} - Everything You Need to Know"
- Description: [SEO-optimized description]
- Tags: ${topic}, tutorial, guide, how-to
- End screen: Subscribe button + 2 related videos`

    // Save to content library
    const contentItems = loadContent()
    const newContent: ContentItem = {
      id: `video-${Date.now()}`,
      type: 'video-script',
      title: `Video: ${topic}`,
      content: script,
      keywords: [topic, 'video', style],
      createdAt: new Date().toISOString(),
      published: false,
    }
    contentItems.push(newContent)
    saveContent(contentItems)

    return `✅ **Video Script Generated!**

**Topic:** ${topic}
**Duration:** ${duration} minutes
**Style:** ${style}
**ID:** ${newContent.id}

**Script Preview:**
${script.substring(0, 500)}...

📁 Saved to content library
🎬 Ready for production!
💡 Includes B-roll suggestions and production notes`
  } catch (err: any) {
    return `Error generating video script: ${err.message}`
  }
}

// List all content
export function listContent(filter?: 'published' | 'unpublished' | string): string {
  try {
    const content = loadContent()
    
    let filtered = content
    if (filter === 'published') {
      filtered = content.filter(c => c.published)
    } else if (filter === 'unpublished') {
      filtered = content.filter(c => !c.published)
    } else if (filter) {
      filtered = content.filter(c => c.type === filter)
    }

    if (filtered.length === 0) {
      return '📭 No content found. Use content generation tools to create content!'
    }

    let result = `**📚 Content Library (${filtered.length} items)**\n\n`

    filtered.forEach((item, i) => {
      result += `**${i + 1}. ${item.title}**\n`
      result += `   📝 Type: ${item.type}\n`
      result += `   🏷️ Keywords: ${item.keywords.join(', ')}\n`
      result += `   📅 Created: ${new Date(item.createdAt).toLocaleDateString()}\n`
      result += `   ${item.published ? '✅ Published' : '⏳ Unpublished'}\n`
      if (item.platform) result += `   🌐 Platform: ${item.platform}\n`
      if (item.views) result += `   👁️ Views: ${item.views}\n`
      if (item.earnings) result += `   💰 Earnings: $${item.earnings}\n`
      result += `   🆔 ID: ${item.id}\n\n`
    })

    return result
  } catch (err: any) {
    return `Error listing content: ${err.message}`
  }
}

// Get content by ID
export function getContent(contentId: string): string {
  try {
    const content = loadContent()
    const item = content.find(c => c.id === contentId)

    if (!item) {
      return `❌ Content with ID "${contentId}" not found`
    }

    let result = `**📄 ${item.title}**\n\n`
    result += `**Type:** ${item.type}\n`
    result += `**Keywords:** ${item.keywords.join(', ')}\n`
    result += `**Created:** ${new Date(item.createdAt).toLocaleDateString()}\n`
    result += `**Status:** ${item.published ? '✅ Published' : '⏳ Unpublished'}\n`
    if (item.platform) result += `**Platform:** ${item.platform}\n`
    if (item.url) result += `**URL:** ${item.url}\n`
    if (item.views) result += `**Views:** ${item.views}\n`
    if (item.earnings) result += `**Earnings:** $${item.earnings}\n`
    result += `\n**Content:**\n${item.content}`

    return result
  } catch (err: any) {
    return `Error getting content: ${err.message}`
  }
}

// Mark content as published
export function publishContent(
  contentId: string,
  url?: string,
  platform?: string
): string {
  try {
    const content = loadContent()
    const item = content.find(c => c.id === contentId)

    if (!item) {
      return `❌ Content with ID "${contentId}" not found`
    }

    item.published = true
    item.publishedAt = new Date().toISOString()
    if (url) item.url = url
    if (platform) item.platform = platform

    saveContent(content)

    return `✅ **Content Published!**

**Title:** ${item.title}
**Type:** ${item.type}
**Published:** ${new Date(item.publishedAt).toLocaleString()}
${url ? `**URL:** ${url}` : ''}
${platform ? `**Platform:** ${platform}` : ''}

💡 Use \`update_content_stats\` to track views and earnings`
  } catch (err: any) {
    return `Error publishing content: ${err.message}`
  }
}

// Update content statistics
export function updateContentStats(
  contentId: string,
  views?: number,
  engagement?: number,
  earnings?: number
): string {
  try {
    const content = loadContent()
    const item = content.find(c => c.id === contentId)

    if (!item) {
      return `❌ Content with ID "${contentId}" not found`
    }

    if (views !== undefined) item.views = (item.views || 0) + views
    if (engagement !== undefined) item.engagement = (item.engagement || 0) + engagement
    if (earnings !== undefined) item.earnings = (item.earnings || 0) + earnings

    saveContent(content)

    return `✅ **Stats Updated!**

**Content:** ${item.title}
**Views:** ${item.views || 0}
**Engagement:** ${item.engagement || 0}
**Earnings:** $${item.earnings || 0}`
  } catch (err: any) {
    return `Error updating stats: ${err.message}`
  }
}

// Get content statistics
export function getContentStats(): string {
  try {
    const content = loadContent()

    const stats: ContentStats = {
      totalContent: content.length,
      published: content.filter(c => c.published).length,
      pending: content.filter(c => !c.published).length,
      totalViews: content.reduce((sum, c) => sum + (c.views || 0), 0),
      totalEngagement: content.reduce((sum, c) => sum + (c.engagement || 0), 0),
      totalEarnings: content.reduce((sum, c) => sum + (c.earnings || 0), 0),
      byType: {},
      byPlatform: {},
    }

    // Count by type
    content.forEach(c => {
      stats.byType[c.type] = (stats.byType[c.type] || 0) + 1
      if (c.platform) {
        stats.byPlatform[c.platform] = (stats.byPlatform[c.platform] || 0) + 1
      }
    })

    let result = `**📊 Content Statistics**\n\n`
    result += `**Overview:**\n`
    result += `- Total Content: ${stats.totalContent}\n`
    result += `- Published: ${stats.published}\n`
    result += `- Pending: ${stats.pending}\n`
    result += `- Total Views: ${stats.totalViews.toLocaleString()}\n`
    result += `- Total Engagement: ${stats.totalEngagement.toLocaleString()}\n`
    result += `- Total Earnings: $${stats.totalEarnings.toFixed(2)}\n\n`

    result += `**By Type:**\n`
    Object.entries(stats.byType).forEach(([type, count]) => {
      result += `- ${type}: ${count}\n`
    })

    if (Object.keys(stats.byPlatform).length > 0) {
      result += `\n**By Platform:**\n`
      Object.entries(stats.byPlatform).forEach(([platform, count]) => {
        result += `- ${platform}: ${count}\n`
      })
    }

    return result
  } catch (err: any) {
    return `Error getting stats: ${err.message}`
  }
}

// Generate content ideas
export function generateContentIdeas(
  niche: string,
  count: number = 10
): string {
  try {
    const ideas = [
      `How to Get Started with ${niche}`,
      `Top 10 ${niche} Tips for Beginners`,
      `${niche} Mistakes to Avoid`,
      `The Ultimate ${niche} Guide`,
      `${niche} Tools You Need to Know`,
      `${niche} Trends in 2026`,
      `${niche} Case Study: Real Results`,
      `${niche} vs [Alternative]: Which is Better?`,
      `5 Ways to Improve Your ${niche} Skills`,
      `${niche} Success Stories`,
      `${niche} Myths Debunked`,
      `${niche} for Advanced Users`,
      `${niche} Resources and Tools`,
      `${niche} Best Practices`,
      `The Future of ${niche}`,
    ]

    let result = `**💡 Content Ideas for "${niche}" (${count} ideas)**\n\n`

    for (let i = 0; i < Math.min(count, ideas.length); i++) {
      result += `${i + 1}. ${ideas[i]}\n`
    }

    result += `\n💡 Use \`generate_blog_post\` or \`generate_social_post\` to create content from these ideas!`

    return result
  } catch (err: any) {
    return `Error generating ideas: ${err.message}`
  }
}

// Delete content
export function deleteContent(contentId: string): string {
  try {
    const content = loadContent()
    const index = content.findIndex(c => c.id === contentId)

    if (index === -1) {
      return `❌ Content with ID "${contentId}" not found`
    }

    const deleted = content.splice(index, 1)[0]
    saveContent(content)

    return `✅ Deleted content: "${deleted.title}"`
  } catch (err: any) {
    return `Error deleting content: ${err.message}`
  }
}
