// Web search with multiple providers
export async function webSearch(query: string): Promise<string> {
  // Try SerpAPI (has free tier)
  const serpResult = await trySerpAPI(query)
  if (serpResult) return serpResult

  // Try Google Custom Search (if configured)
  const googleResult = await tryGoogleSearch(query)
  if (googleResult) return googleResult

  // Fallback to Bing Search
  const bingResult = await tryBingSearch(query)
  if (bingResult) return bingResult

  // Last resort: DuckDuckGo
  const ddgResult = await tryDuckDuckGo(query)
  if (ddgResult) return ddgResult

  return `No results found for "${query}". All search providers returned empty results. Try configuring SERPAPI_KEY, GOOGLE_SEARCH_API_KEY, or BING_SEARCH_API_KEY in your .env file.`
}

async function trySerpAPI(query: string): Promise<string | null> {
  try {
    const apiKey = process.env.SERPAPI_KEY

    if (!apiKey) {
      console.log('⚠️ SerpAPI key not found, skipping')
      return null // Skip if not configured
    }

    console.log('🔍 Trying SerpAPI search...')
    const url = `https://serpapi.com/search.json?q=${encodeURIComponent(query)}&api_key=${apiKey}&num=10`
    const res = await fetch(url)
    const data = await res.json()

    if (data.organic_results && data.organic_results.length > 0) {
      console.log('✅ SerpAPI returned results')
      const results = data.organic_results.slice(0, 8).map((item: any) => {
        return `**${item.title}**\n${item.snippet}\nSource: ${item.link}`
      })
      
      // Add answer box if available
      let answer = ''
      if (data.answer_box) {
        if (data.answer_box.answer) {
          answer = `**Direct Answer:** ${data.answer_box.answer}\n\n`
        } else if (data.answer_box.snippet) {
          answer = `**Featured Snippet:** ${data.answer_box.snippet}\n\n`
        } else if (data.answer_box.title) {
          answer = `**Featured:** ${data.answer_box.title}\n${data.answer_box.snippet || ''}\n\n`
        }
      }
      
      // Add sports results if available
      let sportsInfo = ''
      if (data.sports_results) {
        sportsInfo = `**Sports Results:**\n${JSON.stringify(data.sports_results, null, 2)}\n\n`
      }

      return `${answer}${sportsInfo}**Search Results:**\n\n${results.join('\n\n')}`
    }

    console.log('⚠️ SerpAPI returned no organic results')
    return null
  } catch (err) {
    console.error('❌ SerpAPI search error:', err)
    return null
  }
}

async function tryGoogleSearch(query: string): Promise<string | null> {
  try {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID

    if (!apiKey || !searchEngineId) {
      return null // Skip if not configured
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(query)}`
    const res = await fetch(url)
    const data = await res.json()

    if (data.items && data.items.length > 0) {
      const results = data.items.slice(0, 5).map((item: any) => {
        return `**${item.title}**\n${item.snippet}\nSource: ${item.link}`
      })
      return `**Google Search Results:**\n\n${results.join('\n\n')}`
    }

    return null
  } catch (err) {
    console.error('Google search error:', err)
    return null
  }
}

async function tryBingSearch(query: string): Promise<string | null> {
  try {
    const apiKey = process.env.BING_SEARCH_API_KEY

    if (!apiKey) {
      return null // Skip if not configured
    }

    const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=5`
    const res = await fetch(url, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey
      }
    })
    const data = await res.json()

    if (data.webPages?.value && data.webPages.value.length > 0) {
      const results = data.webPages.value.map((item: any) => {
        return `**${item.name}**\n${item.snippet}\nSource: ${item.url}`
      })
      return `**Bing Search Results:**\n\n${results.join('\n\n')}`
    }

    return null
  } catch (err) {
    console.error('Bing search error:', err)
    return null
  }
}

async function tryDuckDuckGo(query: string): Promise<string | null> {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Jarvis-AI/1.0' }
    })
    const data = await res.json()

    const parts: string[] = []

    if (data.AbstractText) {
      parts.push(`**Summary**: ${data.AbstractText}`)
      if (data.AbstractURL) parts.push(`Source: ${data.AbstractURL}`)
    }

    if (data.Answer) {
      parts.push(`**Answer**: ${data.Answer}`)
    }

    if (data.Definition) {
      parts.push(`**Definition**: ${data.Definition}`)
    }

    const topics = (data.RelatedTopics || [])
      .filter((t: any) => t.Text)
      .slice(0, 5)
      .map((t: any) => `• ${t.Text}`)

    if (topics.length) {
      parts.push(`**Related**:\n${topics.join('\n')}`)
    }

    if (parts.length === 0) {
      return null
    }

    return `**DuckDuckGo Results:**\n\n${parts.join('\n\n')}`
  } catch (err) {
    console.error('DuckDuckGo search error:', err)
    return null
  }
}
