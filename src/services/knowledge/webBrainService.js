/**
 * CRISTA Live Knowledge & Web Brain Engine
 * Integrates real-time Wikipedia REST API, Wikipedia Search,
 * DuckDuckGo Instant Answers, and live web research into a unified offline/online intelligence layer.
 * Empowers CRISTA to provide instant, deep, accurate answers on any subject, person, history,
 * technology, science, news, or culture without requiring paid third-party LLM API keys.
 */

class WebBrainService {
  constructor(db = null) {
    this.db = db;
    this.cache = new Map();
    this.userAgent = 'CristaCompanion/2.0 (Windows NT 10.0; Win64; x64; Personal AI Companion)';
  }

  /**
   * Determine if a user utterance is a knowledge, Wikipedia, search, or browsing query.
   */
  isKnowledgeQuery(rawText) {
    if (!rawText || typeof rawText !== 'string') return false;
    const text = rawText.trim().toLowerCase();

    // Explicit Wikipedia or Web trigger words
    if (/(?:wikipedia|wiki|browse|search the web|google|look up|research|find out|search for)\b/i.test(text)) {
      return true;
    }

    // Direct interrogative questions
    if (/^(who|what|where|when|why|how)\s+(is|was|are|were|do|does|did|can|will|has|have)\b/i.test(text)) {
      return true;
    }

    // Explanatory & topical requests
    if (/^(tell me about|explain|describe|define|elaborate on|summary of|info on|facts about)\b/i.test(text)) {
      return true;
    }

    // Concept / history inquiries
    if (/(?:history of|meaning of|origin of|inventor of|founder of|capital of|distance to|size of|worth of|net worth of)\b/i.test(text)) {
      return true;
    }

    return false;
  }

  /**
   * Extract the core topic from a conversational query
   */
  cleanQueryTopic(rawText) {
    if (!rawText) return '';
    let topic = rawText.trim();

    // Strip leading AI callsign or filler
    topic = topic.replace(/^(?:hey\s+)?(?:crista|mantis)[,\s]*/i, '');
    
    // Strip leading query phrases
    topic = topic.replace(/^(?:search\s+(?:the\s+web\s+for|for|wikipedia\s+for)?|browse|look\s+up|find\s+out\s+about|tell\s+me\s+about|can\s+you\s+(?:tell\s+me\s+about|explain)|explain|what\s+is|what\s+are|what\s+was|who\s+is|who\s+was|where\s+is|how\s+does|how\s+do|define|info\s+on)\s+/i, '');

    // Strip trailing punctuation
    topic = topic.replace(/[?!.]+$/, '').trim();

    return topic || rawText.trim();
  }

  /**
   * Search Wikipedia via REST Summary API with fallback to MediaWiki Search API
   */
  async queryWikipedia(query) {
    const cleanTopic = this.cleanQueryTopic(query);
    if (!cleanTopic) return null;

    const cacheKey = `wiki:${cleanTopic.toLowerCase()}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      // 1. Try direct summary lookup by normalized title
      const normalizedTitle = cleanTopic.replace(/\s+/g, '_');
      const directUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(normalizedTitle)}`;

      let res = await fetch(directUrl, {
        headers: { 'User-Agent': this.userAgent, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4500)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.extract && data.type !== 'disambiguation') {
          const result = {
            found: true,
            title: data.title,
            description: data.description || '',
            extract: data.extract,
            thumbnail: data.thumbnail?.source || null,
            url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(data.title)}`,
            source: 'Wikipedia'
          };
          this.cache.set(cacheKey, result);
          return result;
        }
      }

      // 2. Fallback: Search MediaWiki query API for the closest matching page
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanTopic)}&utf8=&format=json&origin=*`;
      const searchRes = await fetch(searchUrl, {
        headers: { 'User-Agent': this.userAgent, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(4500)
      });

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const topHit = searchData?.query?.search?.[0];
        if (topHit && topHit.title) {
          // Fetch summary for top hit
          const hitUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topHit.title.replace(/\s+/g, '_'))}`;
          const hitRes = await fetch(hitUrl, {
            headers: { 'User-Agent': this.userAgent, 'Accept': 'application/json' },
            signal: AbortSignal.timeout(4500)
          });

          if (hitRes.ok) {
            const hitData = await hitRes.json();
            if (hitData.extract) {
              const result = {
                found: true,
                title: hitData.title,
                description: hitData.description || '',
                extract: hitData.extract,
                thumbnail: hitData.thumbnail?.source || null,
                url: hitData.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(hitData.title)}`,
                source: 'Wikipedia'
              };
              this.cache.set(cacheKey, result);
              return result;
            }
          }
        }
      }
    } catch (err) {
      console.warn('[WebBrain] Wikipedia query warning:', err.message);
    }

    return null;
  }

  /**
   * Search DuckDuckGo Instant Answer API for live web knowledge and quick facts
   */
  async queryDuckDuckGo(query) {
    const cleanTopic = this.cleanQueryTopic(query);
    if (!cleanTopic) return null;

    const cacheKey = `ddg:${cleanTopic.toLowerCase()}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(cleanTopic)}&format=json&no_html=1&skip_disambig=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': this.userAgent },
        signal: AbortSignal.timeout(4500)
      });

      if (res.ok) {
        const data = await res.json();
        const abstract = data.AbstractText || '';
        const related = (data.RelatedTopics || [])
          .filter(t => t.Text && !t.Topics)
          .slice(0, 3)
          .map(t => t.Text);

        if (abstract || related.length > 0) {
          const result = {
            found: true,
            heading: data.Heading || cleanTopic,
            abstract,
            related,
            url: data.AbstractURL || null,
            source: data.AbstractSource || 'Web'
          };
          this.cache.set(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      console.warn('[WebBrain] DuckDuckGo query warning:', err.message);
    }

    return null;
  }

  /**
   * Main Brain Query: Simultaneously consults Wikipedia & DuckDuckGo,
   * synthesizes an authoritative, natural conversational answer for Crista.
   */
  async consultBrain(rawText, callsign = 'boss') {
    const cleanTopic = this.cleanQueryTopic(rawText);
    console.log(`[WebBrain] Consulting brain knowledge base for: "${cleanTopic}"...`);

    const [wikiResult, ddgResult] = await Promise.allSettled([
      this.queryWikipedia(rawText),
      this.queryDuckDuckGo(rawText)
    ]);

    const wiki = wikiResult.status === 'fulfilled' ? wikiResult.value : null;
    const ddg = ddgResult.status === 'fulfilled' ? ddgResult.value : null;

    if (!wiki && !ddg) {
      return null;
    }

    // Build intelligent, conversational synthesis
    let primaryKnowledge = '';
    let title = cleanTopic;
    let url = null;
    let keyFacts = [];

    if (wiki && wiki.extract) {
      primaryKnowledge = wiki.extract;
      title = wiki.title;
      url = wiki.url;
      if (wiki.description) {
        title = `${wiki.title} (${wiki.description})`;
      }
    } else if (ddg && ddg.abstract) {
      primaryKnowledge = ddg.abstract;
      title = ddg.heading;
      url = ddg.url;
    }

    if (ddg && ddg.related && ddg.related.length > 0) {
      keyFacts = ddg.related;
    }

    // Clean text for speech fluency (remove bracket citations [1], [2], etc.)
    const cleanSpeech = primaryKnowledge.replace(/\[\d+\]/g, '').trim();

    // Create Crista's human response
    let reply = `${cleanSpeech}`;

    if (keyFacts.length > 0 && !primaryKnowledge.includes(keyFacts[0])) {
      reply += `\n\nKey Insights:\n` + keyFacts.map(f => `• ${f}`).join('\n');
    }

    if (url) {
      reply += `\n\nSource: ${url}`;
    }

    return {
      success: true,
      query: cleanTopic,
      title,
      reply,
      spokenReply: cleanSpeech,
      url,
      source: wiki ? 'Wikipedia' : 'DuckDuckGo Web Knowledge'
    };
  }
}

module.exports = WebBrainService;
