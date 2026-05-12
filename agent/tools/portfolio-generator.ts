import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const PORTFOLIO_PATH = join(process.cwd(), 'portfolio')
const PORTFOLIO_DATA_PATH = join(PORTFOLIO_PATH, 'portfolio-data.json')
const PROJECTS_PATH = join(PORTFOLIO_PATH, 'projects')

interface Project {
  id: string
  title: string
  description: string
  technologies: string[]
  category: string
  imageUrl?: string
  demoUrl?: string
  githubUrl?: string
  features: string[]
  challenges?: string
  results?: string
  createdAt: string
}

interface PortfolioData {
  personalInfo: {
    name: string
    title: string
    bio: string
    email: string
    phone?: string
    location?: string
    website?: string
    github?: string
    linkedin?: string
    twitter?: string
  }
  skills: {
    category: string
    items: string[]
  }[]
  experience: {
    title: string
    company: string
    duration: string
    description: string
    achievements: string[]
  }[]
  education: {
    degree: string
    institution: string
    year: string
    description?: string
  }[]
  projects: Project[]
  testimonials: {
    name: string
    role: string
    company: string
    text: string
    rating?: number
  }[]
}

// Initialize portfolio directory
function initPortfolio(): void {
  if (!existsSync(PORTFOLIO_PATH)) {
    mkdirSync(PORTFOLIO_PATH, { recursive: true })
  }
  if (!existsSync(PROJECTS_PATH)) {
    mkdirSync(PROJECTS_PATH, { recursive: true })
  }
}

// Load portfolio data
function loadPortfolioData(): PortfolioData | null {
  if (!existsSync(PORTFOLIO_DATA_PATH)) {
    return null
  }
  try {
    const data = readFileSync(PORTFOLIO_DATA_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

// Save portfolio data
function savePortfolioData(data: PortfolioData): void {
  initPortfolio()
  writeFileSync(PORTFOLIO_DATA_PATH, JSON.stringify(data, null, 2))
}

// Set personal information
export function setPortfolioInfo(info: {
  name: string
  title: string
  bio: string
  email: string
  phone?: string
  location?: string
  website?: string
  github?: string
  linkedin?: string
  twitter?: string
}): string {
  try {
    let portfolio = loadPortfolioData()
    
    if (!portfolio) {
      portfolio = {
        personalInfo: info,
        skills: [],
        experience: [],
        education: [],
        projects: [],
        testimonials: []
      }
    } else {
      portfolio.personalInfo = info
    }
    
    savePortfolioData(portfolio)
    
    return `✅ **Portfolio Info Updated!**

**Name:** ${info.name}
**Title:** ${info.title}
**Bio:** ${info.bio}
**Email:** ${info.email}
${info.phone ? `**Phone:** ${info.phone}` : ''}
${info.location ? `**Location:** ${info.location}` : ''}
${info.website ? `**Website:** ${info.website}` : ''}
${info.github ? `**GitHub:** ${info.github}` : ''}
${info.linkedin ? `**LinkedIn:** ${info.linkedin}` : ''}

💡 Next: Add skills with \`add_portfolio_skills\``
  } catch (err: any) {
    return `Error setting portfolio info: ${err.message}`
  }
}

// Add skills
export function addPortfolioSkills(category: string, skills: string[]): string {
  try {
    let portfolio = loadPortfolioData()
    
    if (!portfolio) {
      return '❌ Please set portfolio info first using \`set_portfolio_info\`'
    }
    
    // Check if category exists
    const existingCategory = portfolio.skills.find(s => s.category === category)
    
    if (existingCategory) {
      existingCategory.items = [...new Set([...existingCategory.items, ...skills])]
    } else {
      portfolio.skills.push({ category, items: skills })
    }
    
    savePortfolioData(portfolio)
    
    return `✅ **Skills Added!**

**Category:** ${category}
**Skills:** ${skills.join(', ')}

💡 Add more categories or use \`add_portfolio_project\` to add projects`
  } catch (err: any) {
    return `Error adding skills: ${err.message}`
  }
}

// Add project
export function addPortfolioProject(project: {
  title: string
  description: string
  technologies: string[]
  category: string
  imageUrl?: string
  demoUrl?: string
  githubUrl?: string
  features: string[]
  challenges?: string
  results?: string
}): string {
  try {
    let portfolio = loadPortfolioData()
    
    if (!portfolio) {
      return '❌ Please set portfolio info first using \`set_portfolio_info\`'
    }
    
    const newProject: Project = {
      id: `project-${Date.now()}`,
      ...project,
      createdAt: new Date().toISOString()
    }
    
    portfolio.projects.push(newProject)
    savePortfolioData(portfolio)
    
    return `✅ **Project Added!**

**Title:** ${project.title}
**Category:** ${project.category}
**Technologies:** ${project.technologies.join(', ')}
**Features:** ${project.features.length} features
${project.demoUrl ? `**Demo:** ${project.demoUrl}` : ''}
${project.githubUrl ? `**GitHub:** ${project.githubUrl}` : ''}

**ID:** ${newProject.id}

💡 Add more projects or use \`generate_portfolio_website\` to create your portfolio site`
  } catch (err: any) {
    return `Error adding project: ${err.message}`
  }
}

// Add experience
export function addPortfolioExperience(experience: {
  title: string
  company: string
  duration: string
  description: string
  achievements: string[]
}): string {
  try {
    let portfolio = loadPortfolioData()
    
    if (!portfolio) {
      return '❌ Please set portfolio info first using \`set_portfolio_info\`'
    }
    
    portfolio.experience.push(experience)
    savePortfolioData(portfolio)
    
    return `✅ **Experience Added!**

**Title:** ${experience.title}
**Company:** ${experience.company}
**Duration:** ${experience.duration}
**Achievements:** ${experience.achievements.length} listed`
  } catch (err: any) {
    return `Error adding experience: ${err.message}`
  }
}

// Add education
export function addPortfolioEducation(education: {
  degree: string
  institution: string
  year: string
  description?: string
}): string {
  try {
    let portfolio = loadPortfolioData()
    
    if (!portfolio) {
      return '❌ Please set portfolio info first using \`set_portfolio_info\`'
    }
    
    portfolio.education.push(education)
    savePortfolioData(portfolio)
    
    return `✅ **Education Added!**

**Degree:** ${education.degree}
**Institution:** ${education.institution}
**Year:** ${education.year}`
  } catch (err: any) {
    return `Error adding education: ${err.message}`
  }
}

// Add testimonial
export function addPortfolioTestimonial(testimonial: {
  name: string
  role: string
  company: string
  text: string
  rating?: number
}): string {
  try {
    let portfolio = loadPortfolioData()
    
    if (!portfolio) {
      return '❌ Please set portfolio info first using \`set_portfolio_info\`'
    }
    
    portfolio.testimonials.push(testimonial)
    savePortfolioData(portfolio)
    
    return `✅ **Testimonial Added!**

**From:** ${testimonial.name} (${testimonial.role} at ${testimonial.company})
${testimonial.rating ? `**Rating:** ${'⭐'.repeat(testimonial.rating)}` : ''}

💡 Add more testimonials to build credibility`
  } catch (err: any) {
    return `Error adding testimonial: ${err.message}`
  }
}

// Generate portfolio website (HTML)
export function generatePortfolioWebsite(): string {
  try {
    const portfolio = loadPortfolioData()
    
    if (!portfolio) {
      return '❌ No portfolio data found. Please set up your portfolio first.'
    }
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${portfolio.personalInfo.name} - ${portfolio.personalInfo.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #f5f5f5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }
        
        header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 80px 0;
            text-align: center;
        }
        
        header h1 {
            font-size: 3em;
            margin-bottom: 10px;
        }
        
        header h2 {
            font-size: 1.5em;
            font-weight: 300;
            margin-bottom: 20px;
        }
        
        header p {
            font-size: 1.1em;
            max-width: 600px;
            margin: 0 auto 30px;
            opacity: 0.9;
        }
        
        .social-links {
            display: flex;
            gap: 20px;
            justify-content: center;
            margin-top: 20px;
        }
        
        .social-links a {
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border: 2px solid white;
            border-radius: 5px;
            transition: all 0.3s;
        }
        
        .social-links a:hover {
            background: white;
            color: #667eea;
        }
        
        section {
            background: white;
            margin: 40px 0;
            padding: 60px 0;
        }
        
        section h2 {
            font-size: 2.5em;
            margin-bottom: 40px;
            text-align: center;
            color: #667eea;
        }
        
        .skills-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 30px;
        }
        
        .skill-category {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        
        .skill-category h3 {
            color: #667eea;
            margin-bottom: 15px;
        }
        
        .skill-category ul {
            list-style: none;
        }
        
        .skill-category li {
            padding: 8px 0;
            border-bottom: 1px solid #e0e0e0;
        }
        
        .skill-category li:last-child {
            border-bottom: none;
        }
        
        .projects-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
        }
        
        .project-card {
            background: white;
            border: 1px solid #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
            transition: transform 0.3s, box-shadow 0.3s;
        }
        
        .project-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .project-card-content {
            padding: 30px;
        }
        
        .project-card h3 {
            color: #667eea;
            margin-bottom: 15px;
        }
        
        .project-card p {
            color: #666;
            margin-bottom: 15px;
        }
        
        .tech-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 15px 0;
        }
        
        .tech-tag {
            background: #667eea;
            color: white;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9em;
        }
        
        .project-links {
            display: flex;
            gap: 15px;
            margin-top: 20px;
        }
        
        .project-links a {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }
        
        .experience-timeline {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .experience-item {
            background: #f8f9fa;
            padding: 30px;
            margin-bottom: 30px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
        }
        
        .experience-item h3 {
            color: #667eea;
            margin-bottom: 5px;
        }
        
        .experience-item h4 {
            color: #666;
            font-weight: 400;
            margin-bottom: 15px;
        }
        
        .experience-item ul {
            margin-left: 20px;
            color: #666;
        }
        
        .testimonials-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
        }
        
        .testimonial-card {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 10px;
            border-top: 4px solid #667eea;
        }
        
        .testimonial-text {
            font-style: italic;
            color: #666;
            margin-bottom: 20px;
        }
        
        .testimonial-author {
            font-weight: 600;
            color: #333;
        }
        
        .testimonial-role {
            color: #999;
            font-size: 0.9em;
        }
        
        footer {
            background: #333;
            color: white;
            text-align: center;
            padding: 40px 0;
        }
        
        .cta-button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 15px 40px;
            border-radius: 5px;
            text-decoration: none;
            font-weight: 600;
            margin-top: 20px;
            transition: background 0.3s;
        }
        
        .cta-button:hover {
            background: #764ba2;
        }
    </style>
</head>
<body>
    <header>
        <div class="container">
            <h1>${portfolio.personalInfo.name}</h1>
            <h2>${portfolio.personalInfo.title}</h2>
            <p>${portfolio.personalInfo.bio}</p>
            <div class="social-links">
                ${portfolio.personalInfo.email ? `<a href="mailto:${portfolio.personalInfo.email}">Email</a>` : ''}
                ${portfolio.personalInfo.github ? `<a href="${portfolio.personalInfo.github}" target="_blank">GitHub</a>` : ''}
                ${portfolio.personalInfo.linkedin ? `<a href="${portfolio.personalInfo.linkedin}" target="_blank">LinkedIn</a>` : ''}
                ${portfolio.personalInfo.website ? `<a href="${portfolio.personalInfo.website}" target="_blank">Website</a>` : ''}
            </div>
        </div>
    </header>

    ${portfolio.skills.length > 0 ? `
    <section id="skills">
        <div class="container">
            <h2>Skills & Expertise</h2>
            <div class="skills-grid">
                ${portfolio.skills.map(skill => `
                <div class="skill-category">
                    <h3>${skill.category}</h3>
                    <ul>
                        ${skill.items.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
                `).join('')}
            </div>
        </div>
    </section>
    ` : ''}

    ${portfolio.projects.length > 0 ? `
    <section id="projects" style="background: #f8f9fa;">
        <div class="container">
            <h2>Featured Projects</h2>
            <div class="projects-grid">
                ${portfolio.projects.map(project => `
                <div class="project-card">
                    <div class="project-card-content">
                        <h3>${project.title}</h3>
                        <p>${project.description}</p>
                        <div class="tech-tags">
                            ${project.technologies.map(tech => `<span class="tech-tag">${tech}</span>`).join('')}
                        </div>
                        <ul>
                            ${project.features.map(feature => `<li>${feature}</li>`).join('')}
                        </ul>
                        <div class="project-links">
                            ${project.demoUrl ? `<a href="${project.demoUrl}" target="_blank">View Demo →</a>` : ''}
                            ${project.githubUrl ? `<a href="${project.githubUrl}" target="_blank">View Code →</a>` : ''}
                        </div>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>
    </section>
    ` : ''}

    ${portfolio.experience.length > 0 ? `
    <section id="experience">
        <div class="container">
            <h2>Experience</h2>
            <div class="experience-timeline">
                ${portfolio.experience.map(exp => `
                <div class="experience-item">
                    <h3>${exp.title}</h3>
                    <h4>${exp.company} | ${exp.duration}</h4>
                    <p>${exp.description}</p>
                    <ul>
                        ${exp.achievements.map(achievement => `<li>${achievement}</li>`).join('')}
                    </ul>
                </div>
                `).join('')}
            </div>
        </div>
    </section>
    ` : ''}

    ${portfolio.testimonials.length > 0 ? `
    <section id="testimonials" style="background: #f8f9fa;">
        <div class="container">
            <h2>Testimonials</h2>
            <div class="testimonials-grid">
                ${portfolio.testimonials.map(testimonial => `
                <div class="testimonial-card">
                    <div class="testimonial-text">"${testimonial.text}"</div>
                    <div class="testimonial-author">${testimonial.name}</div>
                    <div class="testimonial-role">${testimonial.role} at ${testimonial.company}</div>
                    ${testimonial.rating ? `<div style="color: #ffc107; margin-top: 10px;">${'⭐'.repeat(testimonial.rating)}</div>` : ''}
                </div>
                `).join('')}
            </div>
        </div>
    </section>
    ` : ''}

    <section id="contact" style="text-align: center;">
        <div class="container">
            <h2>Let's Work Together</h2>
            <p style="font-size: 1.2em; color: #666; max-width: 600px; margin: 0 auto 20px;">
                I'm always interested in hearing about new projects and opportunities.
            </p>
            <a href="mailto:${portfolio.personalInfo.email}" class="cta-button">Get In Touch</a>
        </div>
    </section>

    <footer>
        <div class="container">
            <p>&copy; ${new Date().getFullYear()} ${portfolio.personalInfo.name}. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>`
    
    // Save HTML file
    const htmlPath = join(PORTFOLIO_PATH, 'index.html')
    writeFileSync(htmlPath, html)
    
    return `✅ **Portfolio Website Generated!**

**Location:** ${htmlPath}

**Includes:**
- Personal info & bio
- ${portfolio.skills.length} skill categories
- ${portfolio.projects.length} projects
- ${portfolio.experience.length} work experiences
- ${portfolio.testimonials.length} testimonials

**Next Steps:**
1. Open ${htmlPath} in your browser to preview
2. Customize colors/styles if needed
3. Deploy to:
   - GitHub Pages (free)
   - Netlify (free)
   - Vercel (free)
   - Your own domain

💡 Use \`generate_portfolio_pdf\` to create a PDF resume`
  } catch (err: any) {
    return `Error generating portfolio: ${err.message}`
  }
}

// View portfolio summary
export function viewPortfolio(): string {
  try {
    const portfolio = loadPortfolioData()
    
    if (!portfolio) {
      return '❌ No portfolio data found. Use \`set_portfolio_info\` to get started.'
    }
    
    let result = `**📁 Your Portfolio**\n\n`
    
    result += `**Personal Info:**\n`
    result += `- Name: ${portfolio.personalInfo.name}\n`
    result += `- Title: ${portfolio.personalInfo.title}\n`
    result += `- Email: ${portfolio.personalInfo.email}\n`
    if (portfolio.personalInfo.location) result += `- Location: ${portfolio.personalInfo.location}\n`
    if (portfolio.personalInfo.github) result += `- GitHub: ${portfolio.personalInfo.github}\n`
    if (portfolio.personalInfo.linkedin) result += `- LinkedIn: ${portfolio.personalInfo.linkedin}\n`
    
    result += `\n**Skills:** ${portfolio.skills.length} categories\n`
    portfolio.skills.forEach(skill => {
      result += `- ${skill.category}: ${skill.items.length} skills\n`
    })
    
    result += `\n**Projects:** ${portfolio.projects.length}\n`
    portfolio.projects.forEach((project, i) => {
      result += `${i + 1}. ${project.title} (${project.category})\n`
    })
    
    result += `\n**Experience:** ${portfolio.experience.length} positions\n`
    result += `**Education:** ${portfolio.education.length} entries\n`
    result += `**Testimonials:** ${portfolio.testimonials.length}\n`
    
    result += `\n💡 Use \`generate_portfolio_website\` to create your portfolio site`
    
    return result
  } catch (err: any) {
    return `Error viewing portfolio: ${err.message}`
  }
}

// Generate portfolio from JARVIS project
export function generateJarvisPortfolio(): string {
  try {
    // Auto-generate portfolio based on JARVIS project
    const jarvisProject: Project = {
      id: 'project-jarvis',
      title: 'JARVIS AI - Advanced Desktop Assistant',
      description: 'A sophisticated AI-powered desktop assistant built with Electron, React, and TypeScript. Features voice control, web automation, freelance job hunting, and content creation capabilities.',
      technologies: ['TypeScript', 'React', 'Electron', 'Node.js', 'Gemini AI', 'Puppeteer', 'SQLite', 'Tailwind CSS'],
      category: 'AI & Automation',
      githubUrl: 'https://github.com/yourusername/jarvis-ai',
      features: [
        'Voice-activated AI assistant with natural language processing',
        'Automated freelance job discovery and application system',
        'AI-powered content creation for blogs, social media, and videos',
        'Web automation and browser control',
        'File system management and code execution',
        'Real-time web search integration',
        'Cross-platform desktop application',
        'Local database for data persistence'
      ],
      challenges: 'Integrated multiple AI providers (Gemini, DeepSeek, Groq) with fallback mechanisms. Implemented secure tool execution system with proper error handling. Created intuitive UI/UX for complex AI interactions.',
      results: 'Successfully built a production-ready AI assistant with 32+ tools, capable of automating freelance work and content creation. Potential to generate $5,000-30,000/month in earnings through automation.',
      createdAt: new Date().toISOString()
    }
    
    let portfolio = loadPortfolioData()
    
    if (!portfolio) {
      return '❌ Please set portfolio info first using \`set_portfolio_info\`'
    }
    
    // Add JARVIS project
    portfolio.projects.push(jarvisProject)
    
    // Add relevant skills if not already present
    const techSkills = ['TypeScript', 'React', 'Node.js', 'Electron', 'AI Integration', 'Web Automation']
    const existingTech = portfolio.skills.find(s => s.category === 'Technologies')
    
    if (existingTech) {
      existingTech.items = [...new Set([...existingTech.items, ...techSkills])]
    } else {
      portfolio.skills.push({
        category: 'Technologies',
        items: techSkills
      })
    }
    
    savePortfolioData(portfolio)
    
    return `✅ **JARVIS Project Added to Portfolio!**

**Project:** JARVIS AI - Advanced Desktop Assistant
**Technologies:** ${jarvisProject.technologies.join(', ')}
**Features:** ${jarvisProject.features.length} key features

**Highlights:**
- AI-powered automation system
- 32+ integrated tools
- Multi-platform support
- Earning potential: $5K-30K/month

💡 This is a STRONG portfolio piece! Use \`generate_portfolio_website\` to showcase it`
  } catch (err: any) {
    return `Error generating JARVIS portfolio: ${err.message}`
  }
}
