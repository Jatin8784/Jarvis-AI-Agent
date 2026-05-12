import { webSearch } from './web-search'
import { executeCode } from './code-executor'
import { readFile, writeFile, listDirectory, editFile, deleteFile, appendText } from './file-system'
import { speak } from './voice'
import { getSystemInfo } from './system-info'
import { getWindowsSettings } from './windows-settings'
import {
  monitorFreelanceJobs,
  generateProposal,
  listUnappliedJobs,
  markJobAsApplied,
  getApplicationStats,
  setFreelanceProfile,
  getFreelanceProfile
} from './freelance-agent'
import {
  searchUpworkJobs,
  searchFiverrGigs,
  navigateToUrl,
  closeBrowser
} from './web-automation'
import {
  generateBlogPost,
  generateSocialPost,
  generateVideoScript,
  listContent,
  getContent,
  publishContent,
  updateContentStats,
  getContentStats,
  generateContentIdeas,
  deleteContent
} from './content-creator'
import {
  setPortfolioInfo,
  addPortfolioSkills,
  addPortfolioProject,
  addPortfolioExperience,
  addPortfolioEducation,
  addPortfolioTestimonial,
  generatePortfolioWebsite,
  viewPortfolio,
  generateJarvisPortfolio
} from './portfolio-generator'

export async function dispatchTool(
  name: string,
  args: Record<string, any>,
  geminiClient?: any
): Promise<string> {
  console.log(`🔧 Tool call: ${name}`, args)

  try {
    switch (name) {
      case 'web_search':
        return await webSearch(args.query)

      case 'execute_code':
        return await executeCode(args.code)

      case 'read_file':
        return await readFile(args.path)

      case 'write_file':
        return writeFile(args.path, args.content)

      case 'list_directory':
        return listDirectory(args.path)

      case 'edit_file':
        return await editFile(args.path, args.instructions)

      case 'delete_file':
        return await deleteFile(args.path)

      case 'append_text':
        return await appendText(args.path, args.text, {
          position: args.position,
          lineNumber: args.lineNumber,
          searchText: args.searchText
        })

      case 'take_screenshot':
        return 'Screenshot functionality requires additional setup. The desktopCapturer API is available in Electron renderer process.'

      case 'speak':
        return await speak(args.text)

      case 'get_system_info':
        return getSystemInfo()

      case 'get_windows_settings':
        return getWindowsSettings()

      // Freelance Agent Tools
      case 'monitor_freelance_jobs':
        return await monitorFreelanceJobs(args.keywords, args.platforms)

      case 'list_unapplied_jobs':
        return listUnappliedJobs()

      case 'generate_proposal':
        return await generateProposal(
          args.jobTitle,
          args.jobDescription,
          args.yourSkills,
          args.yourExperience
        )

      case 'mark_job_applied':
        return markJobAsApplied(args.jobId, args.proposal)

      case 'get_application_stats':
        return getApplicationStats()

      case 'set_freelance_profile':
        return setFreelanceProfile(args)

      case 'get_freelance_profile':
        return getFreelanceProfile()

      // Web Automation Tools
      case 'search_upwork_jobs':
        return await searchUpworkJobs(args.keywords)

      case 'search_fiverr_gigs':
        return await searchFiverrGigs(args.keywords)

      case 'navigate_to_url':
        return await navigateToUrl(args.url)

      case 'close_browser':
        return await closeBrowser()

      // Content Creation Tools
      case 'generate_blog_post':
        return await generateBlogPost(
          args.topic,
          args.keywords,
          args.length,
          args.tone
        )

      case 'generate_social_post':
        return await generateSocialPost(
          args.topic,
          args.platform,
          args.style
        )

      case 'generate_video_script':
        return await generateVideoScript(
          args.topic,
          args.duration,
          args.style
        )

      case 'list_content':
        return listContent(args.filter)

      case 'get_content':
        return getContent(args.contentId)

      case 'publish_content':
        return publishContent(args.contentId, args.url, args.platform)

      case 'update_content_stats':
        return updateContentStats(
          args.contentId,
          args.views,
          args.engagement,
          args.earnings
        )

      case 'get_content_stats':
        return getContentStats()

      case 'generate_content_ideas':
        return generateContentIdeas(args.niche, args.count)

      case 'delete_content':
        return deleteContent(args.contentId)

      // Portfolio Generator Tools
      case 'set_portfolio_info':
        return setPortfolioInfo(args)

      case 'add_portfolio_skills':
        return addPortfolioSkills(args.category, args.skills)

      case 'add_portfolio_project':
        return addPortfolioProject(args)

      case 'add_portfolio_experience':
        return addPortfolioExperience(args)

      case 'add_portfolio_education':
        return addPortfolioEducation(args)

      case 'add_portfolio_testimonial':
        return addPortfolioTestimonial(args)

      case 'generate_portfolio_website':
        return generatePortfolioWebsite()

      case 'view_portfolio':
        return viewPortfolio()

      case 'generate_jarvis_portfolio':
        return generateJarvisPortfolio()

      default:
        return `Unknown tool: ${name}`
    }
  } catch (err: any) {
    return `Tool error (${name}): ${err.message}`
  }
}
