import { searchUpworkJobs, searchFiverrGigs } from './web-automation'
import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'

const JOBS_DB_PATH = join(process.cwd(), 'freelance-jobs.json')
const APPLICATIONS_DB_PATH = join(process.cwd(), 'applications.json')

interface Job {
  id: string
  platform: string
  title: string
  description: string
  budget: string
  posted: string
  link: string
  keywords: string
  foundAt: string
  applied: boolean
}

interface Application {
  jobId: string
  jobTitle: string
  platform: string
  appliedAt: string
  proposal: string
  status: 'pending' | 'accepted' | 'rejected'
}

// Load jobs database
function loadJobs(): Job[] {
  if (!existsSync(JOBS_DB_PATH)) {
    return []
  }
  try {
    const data = readFileSync(JOBS_DB_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// Save jobs database
function saveJobs(jobs: Job[]): void {
  writeFileSync(JOBS_DB_PATH, JSON.stringify(jobs, null, 2))
}

// Load applications database
function loadApplications(): Application[] {
  if (!existsSync(APPLICATIONS_DB_PATH)) {
    return []
  }
  try {
    const data = readFileSync(APPLICATIONS_DB_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// Save applications database
function saveApplications(apps: Application[]): void {
  writeFileSync(APPLICATIONS_DB_PATH, JSON.stringify(apps, null, 2))
}

// Monitor freelance platforms for new jobs
export async function monitorFreelanceJobs(
  keywords: string,
  platforms: string[] = ['upwork', 'fiverr']
): Promise<string> {
  try {
    const allJobs: Job[] = loadJobs()
    let newJobsCount = 0
    let results = `**Monitoring Freelance Jobs for: "${keywords}"**\n\n`

    // Search Upwork
    if (platforms.includes('upwork')) {
      results += '🔍 Searching Upwork...\n'
      const upworkResults = await searchUpworkJobs(keywords)
      
      // Parse results and add to database
      const jobMatches = upworkResults.match(/\*\*\d+\. (.+?)\*\*/g)
      if (jobMatches) {
        jobMatches.forEach((match) => {
          const title = match.replace(/\*\*\d+\. /, '').replace(/\*\*/, '')
          const jobId = `upwork-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          
          // Check if job already exists
          const exists = allJobs.some(j => j.title === title && j.platform === 'upwork')
          if (!exists) {
            allJobs.push({
              id: jobId,
              platform: 'upwork',
              title,
              description: 'See link for details',
              budget: 'N/A',
              posted: new Date().toISOString(),
              link: 'https://www.upwork.com',
              keywords,
              foundAt: new Date().toISOString(),
              applied: false,
            })
            newJobsCount++
          }
        })
      }
      
      results += upworkResults + '\n\n'
    }

    // Search Fiverr
    if (platforms.includes('fiverr')) {
      results += '🔍 Searching Fiverr...\n'
      const fiverrResults = await searchFiverrGigs(keywords)
      results += fiverrResults + '\n\n'
    }

    // Save updated jobs
    saveJobs(allJobs)

    results += `\n📊 **Summary:**\n`
    results += `- Total jobs in database: ${allJobs.length}\n`
    results += `- New jobs found: ${newJobsCount}\n`
    results += `- Jobs not yet applied: ${allJobs.filter(j => !j.applied).length}\n`

    return results
  } catch (err: any) {
    return `Error monitoring freelance jobs: ${err.message}`
  }
}

// Generate AI proposal for a job
export async function generateProposal(
  jobTitle: string,
  jobDescription: string,
  yourSkills: string,
  yourExperience: string
): Promise<string> {
  try {
    // This will be enhanced with actual AI generation
    const proposal = `Dear Hiring Manager,

I am excited to apply for the "${jobTitle}" position. With my expertise in ${yourSkills}, I am confident I can deliver exceptional results for your project.

**Why I'm a Great Fit:**
${yourExperience}

**My Approach:**
1. Thoroughly understand your requirements
2. Deliver high-quality work on time
3. Maintain clear communication throughout
4. Provide revisions until you're 100% satisfied

I have reviewed your project description: "${jobDescription.substring(0, 100)}..." and I'm ready to start immediately.

Looking forward to discussing this opportunity further.

Best regards`

    return proposal
  } catch (err: any) {
    return `Error generating proposal: ${err.message}`
  }
}

// List all unapplied jobs
export function listUnappliedJobs(): string {
  try {
    const jobs = loadJobs()
    const unapplied = jobs.filter(j => !j.applied)

    if (unapplied.length === 0) {
      return '✅ No unapplied jobs in database. Run monitor_freelance_jobs to find new opportunities.'
    }

    let result = `**📋 Unapplied Jobs (${unapplied.length})**\n\n`

    unapplied.forEach((job, i) => {
      result += `**${i + 1}. ${job.title}**\n`
      result += `   🏢 Platform: ${job.platform}\n`
      result += `   💰 Budget: ${job.budget}\n`
      result += `   📅 Found: ${new Date(job.foundAt).toLocaleDateString()}\n`
      result += `   🔗 Link: ${job.link}\n`
      result += `   🏷️ Keywords: ${job.keywords}\n\n`
    })

    return result
  } catch (err: any) {
    return `Error listing jobs: ${err.message}`
  }
}

// Mark job as applied
export function markJobAsApplied(jobId: string, proposal: string): string {
  try {
    const jobs = loadJobs()
    const job = jobs.find(j => j.id === jobId)

    if (!job) {
      return `❌ Job with ID "${jobId}" not found`
    }

    job.applied = true
    saveJobs(jobs)

    // Add to applications
    const applications = loadApplications()
    applications.push({
      jobId: job.id,
      jobTitle: job.title,
      platform: job.platform,
      appliedAt: new Date().toISOString(),
      proposal,
      status: 'pending',
    })
    saveApplications(applications)

    return `✅ Marked job "${job.title}" as applied and saved to applications database`
  } catch (err: any) {
    return `Error marking job as applied: ${err.message}`
  }
}

// Get application statistics
export function getApplicationStats(): string {
  try {
    const jobs = loadJobs()
    const applications = loadApplications()

    const totalJobs = jobs.length
    const appliedJobs = jobs.filter(j => j.applied).length
    const unappliedJobs = totalJobs - appliedJobs

    const pending = applications.filter(a => a.status === 'pending').length
    const accepted = applications.filter(a => a.status === 'accepted').length
    const rejected = applications.filter(a => a.status === 'rejected').length

    const platforms = jobs.reduce((acc, job) => {
      acc[job.platform] = (acc[job.platform] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    let result = `**📊 Freelance Agent Statistics**\n\n`
    result += `**Jobs Database:**\n`
    result += `- Total jobs tracked: ${totalJobs}\n`
    result += `- Applied: ${appliedJobs}\n`
    result += `- Not applied: ${unappliedJobs}\n\n`

    result += `**Applications:**\n`
    result += `- Total applications: ${applications.length}\n`
    result += `- Pending: ${pending}\n`
    result += `- Accepted: ${accepted}\n`
    result += `- Rejected: ${rejected}\n\n`

    result += `**Platforms:**\n`
    Object.entries(platforms).forEach(([platform, count]) => {
      result += `- ${platform}: ${count} jobs\n`
    })

    return result
  } catch (err: any) {
    return `Error getting stats: ${err.message}`
  }
}

// Set user profile for proposals
export function setFreelanceProfile(profile: {
  name: string
  skills: string
  experience: string
  hourlyRate?: string
}): string {
  try {
    const profilePath = join(process.cwd(), 'freelance-profile.json')
    writeFileSync(profilePath, JSON.stringify(profile, null, 2))
    return `✅ Freelance profile saved successfully!\n\n**Your Profile:**\n- Name: ${profile.name}\n- Skills: ${profile.skills}\n- Experience: ${profile.experience}\n- Hourly Rate: ${profile.hourlyRate || 'Not set'}`
  } catch (err: any) {
    return `Error saving profile: ${err.message}`
  }
}

// Get user profile
export function getFreelanceProfile(): string {
  try {
    const profilePath = join(process.cwd(), 'freelance-profile.json')
    if (!existsSync(profilePath)) {
      return '❌ No profile found. Use set_freelance_profile to create one.'
    }

    const data = readFileSync(profilePath, 'utf-8')
    const profile = JSON.parse(data)

    return `**Your Freelance Profile:**\n\n- Name: ${profile.name}\n- Skills: ${profile.skills}\n- Experience: ${profile.experience}\n- Hourly Rate: ${profile.hourlyRate || 'Not set'}`
  } catch (err: any) {
    return `Error loading profile: ${err.message}`
  }
}
