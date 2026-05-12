import puppeteer, { Browser, Page } from 'puppeteer'

let browser: Browser | null = null

// Initialize browser
async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: false, // Set to true for background operation
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })
  }
  return browser
}

// Close browser
export async function closeBrowser(): Promise<string> {
  if (browser) {
    await browser.close()
    browser = null
    return 'Browser closed successfully'
  }
  return 'No browser instance to close'
}

// Navigate to URL and get page content
export async function navigateToUrl(url: string): Promise<string> {
  try {
    const browser = await getBrowser()
    const page = await browser.newPage()
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    
    const title = await page.title()
    const content = await page.evaluate(() => document.body.innerText)
    
    await page.close()
    
    return `**Page Title:** ${title}\n\n**Content Preview:**\n${content.substring(0, 2000)}...`
  } catch (err: any) {
    return `Error navigating to URL: ${err.message}`
  }
}

// Search for freelance jobs on Upwork
export async function searchUpworkJobs(keywords: string, category?: string): Promise<string> {
  try {
    const browser = await getBrowser()
    const page = await browser.newPage()
    
    // Build search URL
    const searchUrl = `https://www.upwork.com/nx/search/jobs/?q=${encodeURIComponent(keywords)}&sort=recency`
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 })
    
    // Wait for job listings to load
    await page.waitForSelector('[data-test="job-tile-list"]', { timeout: 10000 })
    
    // Extract job listings
    const jobs = await page.evaluate(() => {
      const jobElements = document.querySelectorAll('[data-test="JobTile"]')
      const jobList: any[] = []
      
      jobElements.forEach((job, index) => {
        if (index < 10) { // Get first 10 jobs
          const titleEl = job.querySelector('[data-test="job-tile-title"]')
          const descEl = job.querySelector('[data-test="job-description-text"]')
          const budgetEl = job.querySelector('[data-test="job-type-label"]')
          const postedEl = job.querySelector('[data-test="posted-on"]')
          const linkEl = job.querySelector('a[href*="/jobs/"]')
          
          jobList.push({
            title: titleEl?.textContent?.trim() || 'N/A',
            description: descEl?.textContent?.trim().substring(0, 200) || 'N/A',
            budget: budgetEl?.textContent?.trim() || 'N/A',
            posted: postedEl?.textContent?.trim() || 'N/A',
            link: linkEl ? 'https://www.upwork.com' + linkEl.getAttribute('href') : 'N/A',
          })
        }
      })
      
      return jobList
    })
    
    await page.close()
    
    if (jobs.length === 0) {
      return `No jobs found for keywords: "${keywords}"`
    }
    
    // Format results
    let result = `**Found ${jobs.length} Upwork Jobs for "${keywords}"**\n\n`
    
    jobs.forEach((job, i) => {
      result += `**${i + 1}. ${job.title}**\n`
      result += `   💰 ${job.budget}\n`
      result += `   📅 ${job.posted}\n`
      result += `   📝 ${job.description}...\n`
      result += `   🔗 ${job.link}\n\n`
    })
    
    return result
  } catch (err: any) {
    return `Error searching Upwork jobs: ${err.message}\n\n⚠️ Note: You may need to be logged in to Upwork for full access.`
  }
}

// Search for freelance jobs on Fiverr
export async function searchFiverrGigs(keywords: string): Promise<string> {
  try {
    const browser = await getBrowser()
    const page = await browser.newPage()
    
    const searchUrl = `https://www.fiverr.com/search/gigs?query=${encodeURIComponent(keywords)}&source=top-bar&search_in=everywhere&search-autocomplete-original-term=${encodeURIComponent(keywords)}`
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 })
    
    // Wait for gig listings
    await page.waitForSelector('[data-gig-id]', { timeout: 10000 })
    
    // Extract gig data
    const gigs = await page.evaluate(() => {
      const gigElements = document.querySelectorAll('[data-gig-id]')
      const gigList: any[] = []
      
      gigElements.forEach((gig, index) => {
        if (index < 10) {
          const titleEl = gig.querySelector('a.gig-link')
          const priceEl = gig.querySelector('.price')
          const sellerEl = gig.querySelector('.seller-name')
          
          gigList.push({
            title: titleEl?.textContent?.trim() || 'N/A',
            price: priceEl?.textContent?.trim() || 'N/A',
            seller: sellerEl?.textContent?.trim() || 'N/A',
            link: titleEl ? 'https://www.fiverr.com' + titleEl.getAttribute('href') : 'N/A',
          })
        }
      })
      
      return gigList
    })
    
    await page.close()
    
    if (gigs.length === 0) {
      return `No gigs found for keywords: "${keywords}"`
    }
    
    let result = `**Found ${gigs.length} Fiverr Gigs for "${keywords}"**\n\n`
    
    gigs.forEach((gig, i) => {
      result += `**${i + 1}. ${gig.title}**\n`
      result += `   💰 ${gig.price}\n`
      result += `   👤 ${gig.seller}\n`
      result += `   🔗 ${gig.link}\n\n`
    })
    
    return result
  } catch (err: any) {
    return `Error searching Fiverr gigs: ${err.message}`
  }
}

// Fill form on a webpage
export async function fillForm(url: string, formData: Record<string, string>): Promise<string> {
  try {
    const browser = await getBrowser()
    const page = await browser.newPage()
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    
    // Fill form fields
    for (const [selector, value] of Object.entries(formData)) {
      await page.type(selector, value)
    }
    
    await page.close()
    
    return `Form filled successfully with ${Object.keys(formData).length} fields`
  } catch (err: any) {
    return `Error filling form: ${err.message}`
  }
}

// Take screenshot of a webpage
export async function takeWebScreenshot(url: string, savePath: string): Promise<string> {
  try {
    const browser = await getBrowser()
    const page = await browser.newPage()
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await page.screenshot({ path: savePath, fullPage: true })
    
    await page.close()
    
    return `Screenshot saved to: ${savePath}`
  } catch (err: any) {
    return `Error taking screenshot: ${err.message}`
  }
}

// Click element on page
export async function clickElement(url: string, selector: string): Promise<string> {
  try {
    const browser = await getBrowser()
    const page = await browser.newPage()
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })
    await page.click(selector)
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
    
    const newUrl = page.url()
    await page.close()
    
    return `Clicked element "${selector}". New URL: ${newUrl}`
  } catch (err: any) {
    return `Error clicking element: ${err.message}`
  }
}
