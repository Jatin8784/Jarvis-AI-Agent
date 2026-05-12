import { FunctionDeclaration, SchemaType } from '@google/generative-ai'

export const geminiTools: FunctionDeclaration[] = [
  {
    name: 'web_search',
    description: 'Search the web for current information, news, facts, or any topic.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: {
          type: SchemaType.STRING,
          description: 'The search query'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'execute_code',
    description: 'Execute JavaScript code and return the result. Use for calculations, data processing, file operations via Node.js APIs.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        code: {
          type: SchemaType.STRING,
          description: 'JavaScript code to execute. Has access to Node.js built-ins like fs, path, os, etc.'
        },
        description: {
          type: SchemaType.STRING,
          description: 'Brief description of what the code does'
        }
      },
      required: ['code']
    }
  },
  {
    name: 'read_file',
    description: 'Read the contents of a file from the filesystem.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        path: {
          type: SchemaType.STRING,
          description: 'Absolute or relative path to the file'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Write or create a file on the filesystem.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        path: {
          type: SchemaType.STRING,
          description: 'Absolute or relative path for the file'
        },
        content: {
          type: SchemaType.STRING,
          description: 'Content to write to the file'
        }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'list_directory',
    description: 'List files and folders in a directory.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        path: {
          type: SchemaType.STRING,
          description: 'Directory path to list'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'edit_file',
    description: 'Edit an existing file by providing instructions for what changes to make. The AI will read the file, apply changes, and save it.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        path: {
          type: SchemaType.STRING,
          description: 'Path to the file to edit'
        },
        instructions: {
          type: SchemaType.STRING,
          description: 'Clear instructions describing what changes to make to the file'
        }
      },
      required: ['path', 'instructions']
    }
  },
  {
    name: 'delete_file',
    description: 'Permanently delete ANY file (all types: .zip, .exe, .pdf, .mp4, .jpg, etc.) OR folder/directory from the computer. Automatically handles both files and directories with recursive deletion. Use this when user asks to delete, remove, or erase anything.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        path: {
          type: SchemaType.STRING,
          description: 'Path to the file or folder to delete. Works with any file type or directory.'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'append_text',
    description: 'Add text to an existing file at a specific position. Can add to beginning, end, specific line number, or before/after specific text.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        path: {
          type: SchemaType.STRING,
          description: 'Path to the file to add text to'
        },
        text: {
          type: SchemaType.STRING,
          description: 'The text content to add to the file'
        },
        position: {
          type: SchemaType.STRING,
          description: 'Where to add the text: "start" (beginning), "end" (end), "line" (specific line number), "after" (after specific text), "before" (before specific text). Default is "end".',
          enum: ['start', 'end', 'line', 'after', 'before']
        },
        lineNumber: {
          type: SchemaType.NUMBER,
          description: 'Line number where to insert text (1-based). Required when position is "line".'
        },
        searchText: {
          type: SchemaType.STRING,
          description: 'Text to search for in the file. Required when position is "after" or "before".'
        }
      },
      required: ['path', 'text']
    }
  },
  {
    name: 'take_screenshot',
    description: 'Take a screenshot of the current screen and analyze what is visible.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        analyze: {
          type: SchemaType.BOOLEAN,
          description: 'Whether to analyze the screenshot content'
        }
      }
    }
  },
  {
    name: 'speak',
    description: 'Speak text aloud using text-to-speech.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        text: {
          type: SchemaType.STRING,
          description: 'Text to speak aloud'
        }
      },
      required: ['text']
    }
  },
  {
    name: 'get_system_info',
    description: 'Get information about the computer system: OS, CPU, memory, etc.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: 'get_windows_settings',
    description: 'Get Windows user settings, preferences, personalization, and system configuration. Includes user profile, regional settings, environment variables, theme, and more.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: 'monitor_freelance_jobs',
    description: 'Monitor freelance platforms (Upwork, Fiverr) for new job postings matching specific keywords. Saves jobs to database for tracking.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        keywords: {
          type: SchemaType.STRING,
          description: 'Keywords to search for (e.g., "web development", "logo design", "data entry")'
        },
        platforms: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING
          },
          description: 'Platforms to search: ["upwork", "fiverr"]. Default is both.'
        }
      },
      required: ['keywords']
    }
  },
  {
    name: 'list_unapplied_jobs',
    description: 'List all freelance jobs found that have not been applied to yet.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: 'generate_proposal',
    description: 'Generate an AI-powered job proposal/cover letter for a freelance job.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        jobTitle: {
          type: SchemaType.STRING,
          description: 'Title of the job'
        },
        jobDescription: {
          type: SchemaType.STRING,
          description: 'Description of the job requirements'
        },
        yourSkills: {
          type: SchemaType.STRING,
          description: 'Your relevant skills for this job'
        },
        yourExperience: {
          type: SchemaType.STRING,
          description: 'Your relevant experience'
        }
      },
      required: ['jobTitle', 'jobDescription', 'yourSkills', 'yourExperience']
    }
  },
  {
    name: 'mark_job_applied',
    description: 'Mark a job as applied in the database after submitting an application.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        jobId: {
          type: SchemaType.STRING,
          description: 'ID of the job to mark as applied'
        },
        proposal: {
          type: SchemaType.STRING,
          description: 'The proposal text that was submitted'
        }
      },
      required: ['jobId', 'proposal']
    }
  },
  {
    name: 'get_application_stats',
    description: 'Get statistics about freelance job applications: total jobs, applied, pending, accepted, rejected.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: 'set_freelance_profile',
    description: 'Set your freelance profile information (name, skills, experience, rate) for generating proposals.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: 'Your full name'
        },
        skills: {
          type: SchemaType.STRING,
          description: 'Your skills (comma-separated)'
        },
        experience: {
          type: SchemaType.STRING,
          description: 'Brief description of your experience'
        },
        hourlyRate: {
          type: SchemaType.STRING,
          description: 'Your hourly rate (optional)'
        }
      },
      required: ['name', 'skills', 'experience']
    }
  },
  {
    name: 'get_freelance_profile',
    description: 'Get your saved freelance profile information.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: 'search_upwork_jobs',
    description: 'Search for jobs on Upwork platform using keywords. Returns real-time job listings.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        keywords: {
          type: SchemaType.STRING,
          description: 'Keywords to search for'
        }
      },
      required: ['keywords']
    }
  },
  {
    name: 'search_fiverr_gigs',
    description: 'Search for gigs on Fiverr platform using keywords.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        keywords: {
          type: SchemaType.STRING,
          description: 'Keywords to search for'
        }
      },
      required: ['keywords']
    }
  },
  {
    name: 'navigate_to_url',
    description: 'Open a web browser and navigate to a specific URL. Returns page title and content.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        url: {
          type: SchemaType.STRING,
          description: 'URL to navigate to'
        }
      },
      required: ['url']
    }
  },
  {
    name: 'close_browser',
    description: 'Close the web automation browser instance.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: 'generate_blog_post',
    description: 'Generate a complete SEO-optimized blog post on any topic with customizable length and tone.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        topic: {
          type: SchemaType.STRING,
          description: 'Topic for the blog post'
        },
        keywords: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING
          },
          description: 'SEO keywords to include'
        },
        length: {
          type: SchemaType.STRING,
          description: 'Length: "short" (500 words), "medium" (1000 words), "long" (2000 words)',
          enum: ['short', 'medium', 'long']
        },
        tone: {
          type: SchemaType.STRING,
          description: 'Writing tone: "professional", "casual", "technical", "friendly"',
          enum: ['professional', 'casual', 'technical', 'friendly']
        }
      },
      required: ['topic', 'keywords']
    }
  },
  {
    name: 'generate_social_post',
    description: 'Generate social media posts optimized for specific platforms (Twitter, LinkedIn, Facebook, Instagram).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        topic: {
          type: SchemaType.STRING,
          description: 'Topic for the social post'
        },
        platform: {
          type: SchemaType.STRING,
          description: 'Social media platform',
          enum: ['twitter', 'linkedin', 'facebook', 'instagram']
        },
        style: {
          type: SchemaType.STRING,
          description: 'Post style',
          enum: ['informative', 'engaging', 'promotional', 'inspirational']
        }
      },
      required: ['topic', 'platform']
    }
  },
  {
    name: 'generate_video_script',
    description: 'Generate a complete video script with timestamps, B-roll suggestions, and production notes.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        topic: {
          type: SchemaType.STRING,
          description: 'Topic for the video'
        },
        duration: {
          type: SchemaType.NUMBER,
          description: 'Video duration in minutes (default: 5)'
        },
        style: {
          type: SchemaType.STRING,
          description: 'Video style',
          enum: ['tutorial', 'review', 'vlog', 'educational']
        }
      },
      required: ['topic']
    }
  },
  {
    name: 'list_content',
    description: 'List all created content. Can filter by published/unpublished or by type.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        filter: {
          type: SchemaType.STRING,
          description: 'Filter: "published", "unpublished", "blog", "social", "video-script"'
        }
      }
    }
  },
  {
    name: 'get_content',
    description: 'Get full content by ID.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        contentId: {
          type: SchemaType.STRING,
          description: 'Content ID'
        }
      },
      required: ['contentId']
    }
  },
  {
    name: 'publish_content',
    description: 'Mark content as published and optionally add URL and platform.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        contentId: {
          type: SchemaType.STRING,
          description: 'Content ID'
        },
        url: {
          type: SchemaType.STRING,
          description: 'Published URL (optional)'
        },
        platform: {
          type: SchemaType.STRING,
          description: 'Platform where published (optional)'
        }
      },
      required: ['contentId']
    }
  },
  {
    name: 'update_content_stats',
    description: 'Update content statistics: views, engagement, earnings.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        contentId: {
          type: SchemaType.STRING,
          description: 'Content ID'
        },
        views: {
          type: SchemaType.NUMBER,
          description: 'Number of views to add'
        },
        engagement: {
          type: SchemaType.NUMBER,
          description: 'Engagement count to add (likes, comments, shares)'
        },
        earnings: {
          type: SchemaType.NUMBER,
          description: 'Earnings to add in dollars'
        }
      },
      required: ['contentId']
    }
  },
  {
    name: 'get_content_stats',
    description: 'Get overall content statistics: total content, views, earnings, breakdown by type and platform.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: 'generate_content_ideas',
    description: 'Generate content ideas for a specific niche or topic.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        niche: {
          type: SchemaType.STRING,
          description: 'Niche or topic area'
        },
        count: {
          type: SchemaType.NUMBER,
          description: 'Number of ideas to generate (default: 10)'
        }
      },
      required: ['niche']
    }
  },
  {
    name: 'delete_content',
    description: 'Delete content from library by ID.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        contentId: {
          type: SchemaType.STRING,
          description: 'Content ID to delete'
        }
      },
      required: ['contentId']
    }
  },
  {
    name: 'set_portfolio_info',
    description: 'Set personal information for portfolio (name, title, bio, contact info, social links).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: 'Full name'
        },
        title: {
          type: SchemaType.STRING,
          description: 'Professional title (e.g., "Full Stack Developer")'
        },
        bio: {
          type: SchemaType.STRING,
          description: 'Professional bio/summary'
        },
        email: {
          type: SchemaType.STRING,
          description: 'Email address'
        },
        phone: {
          type: SchemaType.STRING,
          description: 'Phone number (optional)'
        },
        location: {
          type: SchemaType.STRING,
          description: 'Location (optional)'
        },
        website: {
          type: SchemaType.STRING,
          description: 'Personal website URL (optional)'
        },
        github: {
          type: SchemaType.STRING,
          description: 'GitHub profile URL (optional)'
        },
        linkedin: {
          type: SchemaType.STRING,
          description: 'LinkedIn profile URL (optional)'
        },
        twitter: {
          type: SchemaType.STRING,
          description: 'Twitter profile URL (optional)'
        }
      },
      required: ['name', 'title', 'bio', 'email']
    }
  },
  {
    name: 'add_portfolio_skills',
    description: 'Add skills to portfolio organized by category (e.g., "Frontend", "Backend", "Tools").',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        category: {
          type: SchemaType.STRING,
          description: 'Skill category name'
        },
        skills: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING
          },
          description: 'Array of skills in this category'
        }
      },
      required: ['category', 'skills']
    }
  },
  {
    name: 'add_portfolio_project',
    description: 'Add a project to portfolio with details, technologies, features, and links.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: 'Project title'
        },
        description: {
          type: SchemaType.STRING,
          description: 'Project description'
        },
        technologies: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING
          },
          description: 'Technologies used'
        },
        category: {
          type: SchemaType.STRING,
          description: 'Project category (e.g., "Web App", "Mobile App", "AI Tool")'
        },
        features: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING
          },
          description: 'Key features of the project'
        },
        imageUrl: {
          type: SchemaType.STRING,
          description: 'Project image URL (optional)'
        },
        demoUrl: {
          type: SchemaType.STRING,
          description: 'Live demo URL (optional)'
        },
        githubUrl: {
          type: SchemaType.STRING,
          description: 'GitHub repository URL (optional)'
        },
        challenges: {
          type: SchemaType.STRING,
          description: 'Technical challenges faced (optional)'
        },
        results: {
          type: SchemaType.STRING,
          description: 'Project results/impact (optional)'
        }
      },
      required: ['title', 'description', 'technologies', 'category', 'features']
    }
  },
  {
    name: 'add_portfolio_experience',
    description: 'Add work experience to portfolio.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: 'Job title'
        },
        company: {
          type: SchemaType.STRING,
          description: 'Company name'
        },
        duration: {
          type: SchemaType.STRING,
          description: 'Duration (e.g., "Jan 2020 - Present")'
        },
        description: {
          type: SchemaType.STRING,
          description: 'Job description'
        },
        achievements: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING
          },
          description: 'Key achievements'
        }
      },
      required: ['title', 'company', 'duration', 'description', 'achievements']
    }
  },
  {
    name: 'add_portfolio_education',
    description: 'Add education to portfolio.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        degree: {
          type: SchemaType.STRING,
          description: 'Degree name'
        },
        institution: {
          type: SchemaType.STRING,
          description: 'Institution name'
        },
        year: {
          type: SchemaType.STRING,
          description: 'Year or duration'
        },
        description: {
          type: SchemaType.STRING,
          description: 'Additional details (optional)'
        }
      },
      required: ['degree', 'institution', 'year']
    }
  },
  {
    name: 'add_portfolio_testimonial',
    description: 'Add client testimonial/review to portfolio.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: 'Client name'
        },
        role: {
          type: SchemaType.STRING,
          description: 'Client role/title'
        },
        company: {
          type: SchemaType.STRING,
          description: 'Client company'
        },
        text: {
          type: SchemaType.STRING,
          description: 'Testimonial text'
        },
        rating: {
          type: SchemaType.NUMBER,
          description: 'Rating out of 5 (optional)'
        }
      },
      required: ['name', 'role', 'company', 'text']
    }
  },
  {
    name: 'generate_portfolio_website',
    description: 'Generate a complete HTML portfolio website with all added information.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: 'view_portfolio',
    description: 'View summary of current portfolio data.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: 'generate_jarvis_portfolio',
    description: 'Automatically add JARVIS AI project to portfolio as a showcase piece.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: 'connect_social_account',
    description: 'Connect a social media account (LinkedIn, Instagram, YouTube, Twitter) for auto-posting.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        platform: {
          type: SchemaType.STRING,
          description: 'Platform name: linkedin, instagram, youtube, twitter, facebook, tiktok'
        },
        username: {
          type: SchemaType.STRING,
          description: 'Your username on the platform'
        },
        accessToken: {
          type: SchemaType.STRING,
          description: 'API access token (optional for now)'
        },
        refreshToken: {
          type: SchemaType.STRING,
          description: 'API refresh token (optional)'
        },
        apiKey: {
          type: SchemaType.STRING,
          description: 'API key (optional)'
        }
      },
      required: ['platform', 'username']
    }
  },
  {
    name: 'disconnect_social_account',
    description: 'Disconnect a social media account.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        platform: {
          type: SchemaType.STRING,
          description: 'Platform name'
        },
        username: {
          type: SchemaType.STRING,
          description: 'Username'
        }
      },
      required: ['platform', 'username']
    }
  },
  {
    name: 'list_social_accounts',
    description: 'List all connected social media accounts.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: 'post_to_linkedin',
    description: 'Post content to LinkedIn with optional image or video.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        content: {
          type: SchemaType.STRING,
          description: 'Post content/text'
        },
        imageUrl: {
          type: SchemaType.STRING,
          description: 'Image URL (optional)'
        },
        videoUrl: {
          type: SchemaType.STRING,
          description: 'Video URL (optional)'
        }
      },
      required: ['content']
    }
  },
  {
    name: 'post_to_instagram',
    description: 'Post image, video, or reel to Instagram.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        caption: {
          type: SchemaType.STRING,
          description: 'Post caption'
        },
        mediaUrl: {
          type: SchemaType.STRING,
          description: 'Image or video URL'
        },
        mediaType: {
          type: SchemaType.STRING,
          description: 'Media type: image, video, or reel',
          enum: ['image', 'video', 'reel']
        }
      },
      required: ['caption', 'mediaUrl']
    }
  },
  {
    name: 'post_to_youtube',
    description: 'Upload video to YouTube.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: 'Video title'
        },
        description: {
          type: SchemaType.STRING,
          description: 'Video description'
        },
        videoUrl: {
          type: SchemaType.STRING,
          description: 'Video file URL or path'
        },
        tags: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING
          },
          description: 'Video tags'
        },
        visibility: {
          type: SchemaType.STRING,
          description: 'Visibility: public, unlisted, or private',
          enum: ['public', 'unlisted', 'private']
        }
      },
      required: ['title', 'description', 'videoUrl', 'tags']
    }
  },
  {
    name: 'post_to_twitter',
    description: 'Post tweet to Twitter with optional media.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        content: {
          type: SchemaType.STRING,
          description: 'Tweet content (max 280 characters)'
        },
        mediaUrl: {
          type: SchemaType.STRING,
          description: 'Media URL (optional)'
        }
      },
      required: ['content']
    }
  },
  {
    name: 'cross_post',
    description: 'Post content to multiple social media platforms at once.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        content: {
          type: SchemaType.STRING,
          description: 'Content to post'
        },
        platforms: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.STRING
          },
          description: 'Array of platforms: linkedin, instagram, twitter, facebook'
        },
        mediaUrl: {
          type: SchemaType.STRING,
          description: 'Media URL (optional)'
        }
      },
      required: ['content', 'platforms']
    }
  },
  {
    name: 'get_post_stats',
    description: 'Get statistics for social media posts (views, likes, comments, shares).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        platform: {
          type: SchemaType.STRING,
          description: 'Filter by platform (optional)'
        }
      }
    }
  },
  {
    name: 'schedule_post',
    description: 'Schedule a post for later.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        platform: {
          type: SchemaType.STRING,
          description: 'Platform name'
        },
        content: {
          type: SchemaType.STRING,
          description: 'Post content'
        },
        scheduledFor: {
          type: SchemaType.STRING,
          description: 'Date/time to post (ISO format)'
        },
        mediaUrl: {
          type: SchemaType.STRING,
          description: 'Media URL (optional)'
        }
      },
      required: ['platform', 'content', 'scheduledFor']
    }
  },
  {
    name: 'create_video_project',
    description: 'Create a new video project for YouTube, Instagram Reel, TikTok, or YouTube Short.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        title: {
          type: SchemaType.STRING,
          description: 'Video title'
        },
        description: {
          type: SchemaType.STRING,
          description: 'Video description'
        },
        format: {
          type: SchemaType.STRING,
          description: 'Video format',
          enum: ['youtube', 'instagram-reel', 'tiktok', 'youtube-short', 'linkedin']
        },
        duration: {
          type: SchemaType.NUMBER,
          description: 'Target duration in seconds (default: 60)'
        }
      },
      required: ['title', 'description', 'format']
    }
  },
  {
    name: 'add_video_scene',
    description: 'Add a scene to a video project (text, image, or video clip).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: {
          type: SchemaType.STRING,
          description: 'Video project ID'
        },
        sceneType: {
          type: SchemaType.STRING,
          description: 'Scene type',
          enum: ['image', 'text', 'video']
        },
        content: {
          type: SchemaType.STRING,
          description: 'Scene content (text or URL)'
        },
        duration: {
          type: SchemaType.NUMBER,
          description: 'Scene duration in seconds'
        },
        style: {
          type: SchemaType.OBJECT,
          description: 'Style options (optional)'
        }
      },
      required: ['projectId', 'sceneType', 'content', 'duration']
    }
  },
  {
    name: 'generate_video_from_script',
    description: 'Automatically generate a video project from a script.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        script: {
          type: SchemaType.STRING,
          description: 'Video script text'
        },
        format: {
          type: SchemaType.STRING,
          description: 'Video format',
          enum: ['youtube', 'instagram-reel', 'tiktok', 'youtube-short']
        },
        style: {
          type: SchemaType.STRING,
          description: 'Visual style',
          enum: ['minimal', 'dynamic', 'professional', 'fun']
        }
      },
      required: ['script']
    }
  },
  {
    name: 'render_video',
    description: 'Render a video project to create the final video file.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: {
          type: SchemaType.STRING,
          description: 'Video project ID'
        }
      },
      required: ['projectId']
    }
  },
  {
    name: 'view_video_project',
    description: 'View details of a video project.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: {
          type: SchemaType.STRING,
          description: 'Video project ID'
        }
      },
      required: ['projectId']
    }
  },
  {
    name: 'list_video_projects',
    description: 'List all video projects.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: 'generate_thumbnail',
    description: 'Generate thumbnail design suggestions for a video.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: {
          type: SchemaType.STRING,
          description: 'Video project ID'
        },
        text: {
          type: SchemaType.STRING,
          description: 'Thumbnail text'
        },
        style: {
          type: SchemaType.STRING,
          description: 'Thumbnail style',
          enum: ['youtube', 'instagram', 'tiktok']
        }
      },
      required: ['projectId', 'text']
    }
  },
  {
    name: 'delete_video_project',
    description: 'Delete a video project.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: {
          type: SchemaType.STRING,
          description: 'Video project ID'
        }
      },
      required: ['projectId']
    }
  }
]
