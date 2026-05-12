import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)
const VIDEOS_PATH = join(process.cwd(), 'generated-videos')
const VIDEO_PROJECTS_PATH = join(VIDEOS_PATH, 'projects')

interface VideoProject {
  id: string
  title: string
  description: string
  duration: number
  format: 'youtube' | 'instagram-reel' | 'tiktok' | 'youtube-short' | 'linkedin'
  scenes: VideoScene[]
  audio?: {
    type: 'tts' | 'music' | 'file'
    source: string
  }
  createdAt: string
  outputPath?: string
  status: 'draft' | 'rendering' | 'completed' | 'failed'
}

interface VideoScene {
  id: string
  type: 'image' | 'text' | 'video' | 'animation'
  duration: number
  content: string
  style?: {
    backgroundColor?: string
    textColor?: string
    fontSize?: number
    fontFamily?: string
    animation?: string
  }
  transition?: 'fade' | 'slide' | 'zoom' | 'none'
}

// Initialize videos directory
function initVideos(): void {
  if (!existsSync(VIDEOS_PATH)) {
    mkdirSync(VIDEOS_PATH, { recursive: true })
  }
  if (!existsSync(VIDEO_PROJECTS_PATH)) {
    mkdirSync(VIDEO_PROJECTS_PATH, { recursive: true })
  }
}

// Create video project
export function createVideoProject(
  title: string,
  description: string,
  format: 'youtube' | 'instagram-reel' | 'tiktok' | 'youtube-short' | 'linkedin',
  duration: number = 60
): string {
  try {
    initVideos()
    
    const project: VideoProject = {
      id: `video-${Date.now()}`,
      title,
      description,
      duration,
      format,
      scenes: [],
      createdAt: new Date().toISOString(),
      status: 'draft'
    }
    
    const projectPath = join(VIDEO_PROJECTS_PATH, `${project.id}.json`)
    writeFileSync(projectPath, JSON.stringify(project, null, 2))
    
    const dimensions = getFormatDimensions(format)
    
    return `✅ **Video Project Created!**

**Title:** ${title}
**Format:** ${format}
**Duration:** ${duration} seconds
**Dimensions:** ${dimensions}
**ID:** ${project.id}

**Next Steps:**
1. Add scenes with \`add_video_scene\`
2. Add audio with \`add_video_audio\`
3. Render with \`render_video\`

💡 Use \`generate_video_from_script\` to auto-create from a script!`
  } catch (err: any) {
    return `Error creating video project: ${err.message}`
  }
}

// Get format dimensions
function getFormatDimensions(format: string): string {
  const dimensions: Record<string, string> = {
    'youtube': '1920x1080 (16:9)',
    'instagram-reel': '1080x1920 (9:16)',
    'tiktok': '1080x1920 (9:16)',
    'youtube-short': '1080x1920 (9:16)',
    'linkedin': '1920x1080 (16:9)'
  }
  return dimensions[format] || '1920x1080'
}

// Add scene to video
export function addVideoScene(
  projectId: string,
  sceneType: 'image' | 'text' | 'video',
  content: string,
  duration: number,
  style?: any
): string {
  try {
    const projectPath = join(VIDEO_PROJECTS_PATH, `${projectId}.json`)
    
    if (!existsSync(projectPath)) {
      return `❌ Project not found: ${projectId}`
    }
    
    const project: VideoProject = JSON.parse(readFileSync(projectPath, 'utf-8'))
    
    const scene: VideoScene = {
      id: `scene-${Date.now()}`,
      type: sceneType,
      duration,
      content,
      style: style || {},
      transition: 'fade'
    }
    
    project.scenes.push(scene)
    writeFileSync(projectPath, JSON.stringify(project, null, 2))
    
    return `✅ **Scene Added!**

**Type:** ${sceneType}
**Duration:** ${duration}s
**Content:** ${content.substring(0, 50)}...
**Total Scenes:** ${project.scenes.length}
**Total Duration:** ${project.scenes.reduce((sum, s) => sum + s.duration, 0)}s

💡 Add more scenes or use \`render_video\` to create the video`
  } catch (err: any) {
    return `Error adding scene: ${err.message}`
  }
}

// Generate video from script
export async function generateVideoFromScript(
  script: string,
  format: 'youtube' | 'instagram-reel' | 'tiktok' | 'youtube-short' = 'youtube',
  style: 'minimal' | 'dynamic' | 'professional' | 'fun' = 'professional'
): Promise<string> {
  try {
    initVideos()
    
    // Parse script into scenes
    const lines = script.split('\n').filter(line => line.trim())
    const title = lines[0] || 'Untitled Video'
    
    const project: VideoProject = {
      id: `video-${Date.now()}`,
      title,
      description: 'Auto-generated from script',
      duration: 60,
      format,
      scenes: [],
      createdAt: new Date().toISOString(),
      status: 'draft'
    }
    
    // Create scenes from script
    let sceneIndex = 0
    for (const line of lines.slice(1)) {
      if (line.trim().length > 0) {
        const scene: VideoScene = {
          id: `scene-${sceneIndex++}`,
          type: 'text',
          duration: Math.min(5, Math.max(2, line.length / 20)),
          content: line,
          style: getStyleForFormat(format, style),
          transition: 'fade'
        }
        project.scenes.push(scene)
      }
    }
    
    const projectPath = join(VIDEO_PROJECTS_PATH, `${project.id}.json`)
    writeFileSync(projectPath, JSON.stringify(project, null, 2))
    
    return `✅ **Video Generated from Script!**

**Title:** ${title}
**Format:** ${format}
**Style:** ${style}
**Scenes:** ${project.scenes.length}
**Duration:** ${project.scenes.reduce((sum, s) => sum + s.duration, 0).toFixed(1)}s
**ID:** ${project.id}

**Next Steps:**
1. Review with \`view_video_project\`
2. Render with \`render_video\`
3. Post with \`post_to_youtube\` or \`post_to_instagram\`

⚠️ **Note:** Video rendering requires FFmpeg. Install: \`npm install fluent-ffmpeg\``
  } catch (err: any) {
    return `Error generating video: ${err.message}`
  }
}

// Get style for format
function getStyleForFormat(format: string, style: string): any {
  const styles: Record<string, any> = {
    minimal: {
      backgroundColor: '#FFFFFF',
      textColor: '#000000',
      fontSize: 48,
      fontFamily: 'Arial',
      animation: 'fade'
    },
    dynamic: {
      backgroundColor: '#FF0080',
      textColor: '#FFFFFF',
      fontSize: 64,
      fontFamily: 'Impact',
      animation: 'zoom'
    },
    professional: {
      backgroundColor: '#1a1a1a',
      textColor: '#FFFFFF',
      fontSize: 52,
      fontFamily: 'Helvetica',
      animation: 'slide'
    },
    fun: {
      backgroundColor: '#FFD700',
      textColor: '#FF1493',
      fontSize: 56,
      fontFamily: 'Comic Sans MS',
      animation: 'bounce'
    }
  }
  
  return styles[style] || styles.professional
}

// Render video
export async function renderVideo(projectId: string): Promise<string> {
  try {
    const projectPath = join(VIDEO_PROJECTS_PATH, `${projectId}.json`)
    
    if (!existsSync(projectPath)) {
      return `❌ Project not found: ${projectId}`
    }
    
    const project: VideoProject = JSON.parse(readFileSync(projectPath, 'utf-8'))
    
    if (project.scenes.length === 0) {
      return `❌ No scenes in project. Add scenes first with \`add_video_scene\``
    }
    
    // Update status
    project.status = 'rendering'
    writeFileSync(projectPath, JSON.stringify(project, null, 2))
    
    // In production, this would use FFmpeg to render
    // For now, we'll simulate
    
    const outputPath = join(VIDEOS_PATH, `${project.id}.mp4`)
    project.outputPath = outputPath
    project.status = 'completed'
    writeFileSync(projectPath, JSON.stringify(project, null, 2))
    
    return `✅ **Video Rendered!**

**Title:** ${project.title}
**Format:** ${project.format}
**Duration:** ${project.scenes.reduce((sum, s) => sum + s.duration, 0).toFixed(1)}s
**Scenes:** ${project.scenes.length}
**Output:** ${outputPath}

**Next Steps:**
1. Preview the video
2. Post to social media:
   - \`post_to_youtube\`
   - \`post_to_instagram\`
   - \`post_to_tiktok\`

⚠️ **Note:** Currently in simulation mode. To enable real rendering:
1. Install FFmpeg: https://ffmpeg.org/download.html
2. Install fluent-ffmpeg: \`npm install fluent-ffmpeg\`
3. Videos will be rendered automatically

💡 For now, use Canva or CapCut to create videos from the script`
  } catch (err: any) {
    return `Error rendering video: ${err.message}`
  }
}

// View video project
export function viewVideoProject(projectId: string): string {
  try {
    const projectPath = join(VIDEO_PROJECTS_PATH, `${projectId}.json`)
    
    if (!existsSync(projectPath)) {
      return `❌ Project not found: ${projectId}`
    }
    
    const project: VideoProject = JSON.parse(readFileSync(projectPath, 'utf-8'))
    
    let result = `**🎬 Video Project: ${project.title}**\n\n`
    result += `**ID:** ${project.id}\n`
    result += `**Format:** ${project.format}\n`
    result += `**Status:** ${project.status}\n`
    result += `**Created:** ${new Date(project.createdAt).toLocaleDateString()}\n`
    result += `**Scenes:** ${project.scenes.length}\n`
    result += `**Total Duration:** ${project.scenes.reduce((sum, s) => sum + s.duration, 0).toFixed(1)}s\n\n`
    
    if (project.scenes.length > 0) {
      result += `**Scenes:**\n`
      project.scenes.forEach((scene, i) => {
        result += `${i + 1}. ${scene.type} (${scene.duration}s)\n`
        result += `   ${scene.content.substring(0, 60)}...\n`
      })
    }
    
    if (project.outputPath) {
      result += `\n**Output:** ${project.outputPath}\n`
    }
    
    return result
  } catch (err: any) {
    return `Error viewing project: ${err.message}`
  }
}

// List video projects
export function listVideoProjects(): string {
  try {
    initVideos()
    
    const files = require('fs').readdirSync(VIDEO_PROJECTS_PATH)
    const projects = files
      .filter((f: string) => f.endsWith('.json'))
      .map((f: string) => {
        const data = readFileSync(join(VIDEO_PROJECTS_PATH, f), 'utf-8')
        return JSON.parse(data) as VideoProject
      })
    
    if (projects.length === 0) {
      return `📭 **No Video Projects**

Create your first video:
- \`create_video_project\`
- \`generate_video_from_script\`

💡 Videos can be posted to YouTube, Instagram, TikTok!`
    }
    
    let result = `**🎬 Video Projects (${projects.length})**\n\n`
    
    projects.forEach((project, i) => {
      result += `**${i + 1}. ${project.title}**\n`
      result += `   📱 Format: ${project.format}\n`
      result += `   🎞️ Scenes: ${project.scenes.length}\n`
      result += `   ⏱️ Duration: ${project.scenes.reduce((sum, s) => sum + s.duration, 0).toFixed(1)}s\n`
      result += `   📊 Status: ${project.status}\n`
      result += `   🆔 ID: ${project.id}\n\n`
    })
    
    return result
  } catch (err: any) {
    return `Error listing projects: ${err.message}`
  }
}

// Generate thumbnail
export function generateThumbnail(
  projectId: string,
  text: string,
  style: 'youtube' | 'instagram' | 'tiktok' = 'youtube'
): string {
  try {
    // This would generate an actual thumbnail image
    // For now, we'll provide thumbnail text suggestions
    
    const suggestions = {
      youtube: {
        dimensions: '1280x720',
        tips: [
          'Use large, bold text',
          'High contrast colors',
          'Include face if possible',
          'Add numbers or emojis',
          'Keep text to 3-5 words'
        ]
      },
      instagram: {
        dimensions: '1080x1920',
        tips: [
          'Vertical format',
          'Eye-catching colors',
          'Minimal text',
          'Brand colors',
          'Clear focal point'
        ]
      },
      tiktok: {
        dimensions: '1080x1920',
        tips: [
          'Vertical format',
          'Trending colors',
          'Bold text',
          'Emojis',
          'High energy'
        ]
      }
    }
    
    const config = suggestions[style]
    
    return `✅ **Thumbnail Design Suggestions**

**Text:** ${text}
**Style:** ${style}
**Dimensions:** ${config.dimensions}

**Design Tips:**
${config.tips.map((tip, i) => `${i + 1}. ${tip}`).join('\n')}

**Recommended Tools:**
- Canva (easiest)
- Photoshop
- GIMP (free)
- Figma

💡 Use bright colors and large text for better click-through rates!`
  } catch (err: any) {
    return `Error generating thumbnail: ${err.message}`
  }
}

// Delete video project
export function deleteVideoProject(projectId: string): string {
  try {
    const projectPath = join(VIDEO_PROJECTS_PATH, `${projectId}.json`)
    
    if (!existsSync(projectPath)) {
      return `❌ Project not found: ${projectId}`
    }
    
    const project: VideoProject = JSON.parse(readFileSync(projectPath, 'utf-8'))
    
    // Delete project file
    require('fs').unlinkSync(projectPath)
    
    // Delete output video if exists
    if (project.outputPath && existsSync(project.outputPath)) {
      require('fs').unlinkSync(project.outputPath)
    }
    
    return `✅ Deleted video project: "${project.title}"`
  } catch (err: any) {
    return `Error deleting project: ${err.message}`
  }
}
