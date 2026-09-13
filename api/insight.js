/* ============================================================
   ACI — LIVE INTELLIGENCE SIGNAL
   api/insight.js

   Purpose:
   Turn current AI / technology developments into
   short, original editorial signals for the ACI workspace.

   Output:
   {
     text: "...",
     theme: "...",
     source: "live",
     timestamp: "..."
   }

   The frontend limits display to 10 words as a final safeguard,
   but the editorial prompt itself also enforces the limit.
============================================================ */


/* ============================================================
   CONFIGURATION
============================================================ */

const NEWS_FEEDS = [

  {
    theme: "AI infrastructure",
    url:
      "https://news.google.com/rss/search?q=AI+infrastructure+when%3A7d&hl=en-US&gl=US&ceid=US%3Aen"
  },

  {
    theme: "Enterprise AI",
    url:
      "https://news.google.com/rss/search?q=enterprise+AI+when%3A7d&hl=en-US&gl=US&ceid=US%3Aen"
  },

  {
    theme: "AI agents",
    url:
      "https://news.google.com/rss/search?q=AI+agents+when%3A7d&hl=en-US&gl=US&ceid=US%3Aen"
  },

  {
    theme: "AI economics",
    url:
      "https://news.google.com/rss/search?q=AI+inference+cost+model+economics+when%3A7d&hl=en-US&gl=US&ceid=US%3Aen"
  },

  {
    theme: "AI chips",
    url:
      "https://news.google.com/rss/search?q=AI+chips+data+centers+when%3A7d&hl=en-US&gl=US&ceid=US%3Aen"
  },

  {
    theme: "AI productivity",
    url:
      "https://news.google.com/rss/search?q=AI+productivity+business+when%3A7d&hl=en-US&gl=US&ceid=US%3Aen"
  },

  {
    theme: "AI governance",
    url:
      "https://news.google.com/rss/search?q=AI+governance+enterprise+when%3A7d&hl=en-US&gl=US&ceid=US%3Aen"
  }

];


/*
  Fallback signals are deliberately varied.

  They are NOT intended to imitate live news.
  They only keep the UI alive when external feeds/API
  are temporarily unavailable.
*/

const FALLBACK_SIGNALS = [

  {
    text:
      "AI infrastructure is becoming another enterprise cost center.",
    theme:
      "AI economics"
  },

  {
    text:
      "Model selection is quietly becoming a finance decision.",
    theme:
      "AI economics"
  },

  {
    text:
      "AI agents are becoming another enterprise software layer.",
    theme:
      "AI agents"
  },

  {
    text:
      "The next AI advantage may come from orchestration.",
    theme:
      "AI infrastructure"
  },

  {
    text:
      "Cheap inference is changing what businesses automate.",
    theme:
      "AI economics"
  },

  {
    text:
      "AI capability is rising faster than enterprise governance.",
    theme:
      "AI governance"
  },

  {
    text:
      "The model is becoming a replaceable enterprise component.",
    theme:
      "AI infrastructure"
  },

  {
    text:
      "Inference economics may shape the next wave of AI adoption.",
    theme:
      "AI economics"
  },

  {
    text:
      "AI is moving from experiments into operational infrastructure.",
    theme:
      "Enterprise AI"
  },

  {
    text:
      "Enterprise AI value depends on what happens after inference.",
    theme:
      "Enterprise AI"
  },

  {
    text:
      "AI productivity gains increasingly depend on workflow redesign.",
    theme:
      "AI productivity"
  },

  {
    text:
      "AI spending is becoming measurable at the request level.",
    theme:
      "AI economics"
  },

  {
    text:
      "More models create more choices and more routing complexity.",
    theme:
      "AI infrastructure"
  },

  {
    text:
      "AI governance is becoming an operational discipline.",
    theme:
      "AI governance"
  },

  {
    text:
      "Compute availability increasingly shapes AI product strategy.",
    theme:
      "AI infrastructure"
  }

];


/* ============================================================
   XML / RSS HELPERS
============================================================ */

function decodeEntities(value) {

  return String(value || "")

    .replace(
      /&amp;/g,
      "&"
    )

    .replace(
      /&lt;/g,
      "<"
    )

    .replace(
      /&gt;/g,
      ">"
    )

    .replace(
      /&quot;/g,
      '"'
    )

    .replace(
      /&#39;/g,
      "'"
    )

    .replace(
      /&#x27;/gi,
      "'"
    )

    .replace(
      /&nbsp;/g,
      " "
    );

}


function stripHTML(value) {

  return decodeEntities(
    String(value || "")
      .replace(
        /<[^>]*>/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim()
  );

}


/* ============================================================
   WORD LIMIT
============================================================ */

function limitWords(text, maxWords = 10) {

  const clean =
    String(text || "")
      .replace(
        /\s+/g,
        " "
      )
      .trim();


  if (!clean) {
    return "";
  }


  const words =
    clean.split(" ");


  let result =
    words.slice(
      0,
      maxWords
    ).join(" ");


  /*
    Remove accidental leading bullets,
    quotation marks and numbering.
  */

  result =
    result
      .replace(
        /^["'“”‘’•*\-\d.)\s]+/,
        ""
      )
      .trim();


  /*
    Keep punctuation clean.
  */

  if (
    result &&
    !/[.!?]$/.test(result)
  ) {

    result += ".";

  }


  return result;

}


/* ============================================================
   PARSE RSS
============================================================ */

function parseRSS(xml) {

  const items = [];

  const itemMatches =
    xml.match(
      /<item[\s\S]*?<\/item>/gi
    ) || [];


  for (
    const item of itemMatches
  ) {

    const titleMatch =
      item.match(
        /<title[^>]*>([\s\S]*?)<\/title>/i
      );


    const descriptionMatch =
      item.match(
        /<description[^>]*>([\s\S]*?)<\/description>/i
      );


    const pubDateMatch =
      item.match(
        /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i
      );


    const title =
      stripHTML(
        titleMatch
          ? titleMatch[1]
          : ""
      );


    const description =
      stripHTML(
        descriptionMatch
          ? descriptionMatch[1]
          : ""
      );


    const pubDate =
      stripHTML(
        pubDateMatch
          ? pubDateMatch[1]
          : ""
      );


    if (!title) {
      continue;
    }


    items.push({

      title,

      description,

      pubDate

    });

  }


  return items;

}


/* ============================================================
   FETCH ONE NEWS FEED
============================================================ */

async function fetchFeed(feed) {

  const controller =
    new AbortController();


  const timeout =
    setTimeout(
      () => controller.abort(),
      4500
    );


  try {

    const response =
      await fetch(
        feed.url,
        {
          method:
            "GET",

          headers:{
            "User-Agent":
              "ACI-Intelligence/1.0"
          },

          signal:
            controller.signal
        }
      );


    if (!response.ok) {

      throw new Error(
        `News feed returned ${response.status}`
      );

    }


    const xml =
      await response.text();


    const items =
      parseRSS(
        xml
      );


    return items.map(
      item => ({

        ...item,

        theme:
          feed.theme

      })
    );


  } finally {

    clearTimeout(
      timeout
    );

  }

}


/* ============================================================
   FETCH LIVE NEWS
============================================================ */

async function collectSignals() {

  /*
    Fetch several feeds in parallel.

    One failed feed should not kill
    the entire intelligence layer.
  */

  const results =
    await Promise.allSettled(

      NEWS_FEEDS.map(
        fetchFeed
      )

    );


  const items = [];


  results.forEach(
    result => {

      if (
        result.status ===
        "fulfilled"
      ) {

        items.push(
          ...result.value
        );

      }

    }
  );


  /*
    Remove duplicate headlines.
  */

  const seen =
    new Set();


  const unique =
    items.filter(
      item => {

        const key =
          item.title
            .toLowerCase()
            .replace(
              /[^a-z0-9]+/g,
              " "
            )
            .trim();


        if (
          !key ||
          seen.has(key)
        ) {

          return false;

        }


        seen.add(key);

        return true;

      }
    );


  /*
    Keep the feed reasonably small.
  */

  return unique.slice(
    0,
    30
  );

}


/* ============================================================
   SELECT A SIGNAL
============================================================ */

function selectSignal(items) {

  if (!items.length) {
    return null;
  }


  /*
    Pick from the freshest portion,
    while introducing some rotation.
  */

  const pool =
    items.slice(
      0,
      Math.min(
        items.length,
        12
      )
    );


  const index =
    Math.floor(
      Math.random() *
      pool.length
    );


  return pool[index];

}


/* ============================================================
   GEMINI EDITORIAL GENERATION
============================================================ */

async function generateEditorialSignal(
  newsItem
) {

  if (
    !process.env.GEMINI_API_KEY
  ) {

    throw new Error(
      "GEMINI_API_KEY is not configured."
    );

  }


  const prompt = `

You are the editorial intelligence layer
for ACI, an enterprise AI consumption intelligence product.

Create ONE original AI/technology insight
based on the news signal below.

The output will appear as the large opening
thought inside an enterprise AI workspace.

SOURCE THEME:
${newsItem.theme}

NEWS SIGNAL:
${newsItem.title}

CONTEXT:
${newsItem.description || "No additional context available."}

RULES:

1. Return ONLY ONE sentence.
2. Maximum 10 words.
3. Prefer 5 to 9 words.
4. Make it insightful, not descriptive.
5. Do NOT copy the headline.
6. Do NOT mention the publication.
7. Do NOT use quotation marks.
8. Do NOT use hashtags.
9. Do NOT say "breaking news".
10. Do NOT explain your reasoning.
11. Focus on the broader implication for AI,
    enterprise technology, economics,
    infrastructure, productivity, agents,
    governance or business.
12. Avoid generic motivational language.
13. Make it sound like an intelligent
    product/editorial observation.

Return ONLY the final sentence.

`;


  const response =
    await fetch(
      "https://generativelanguage.googleapis.com/v1beta/interactions",
      {

        method:
          "POST",

        headers:{

          "Content-Type":
            "application/json",

          "x-goog-api-key":
            process.env.GEMINI_API_KEY

        },

        body:
          JSON.stringify({

            model:
              "gemini-3.8-flash",

            input:
              prompt,

            store:
              false

          })

      }
    );


  const data =
    await response.json();


  if (!response.ok) {

    throw new Error(
      data?.error?.message ||
      "Gemini editorial generation failed."
    );

  }


  /*
    Gemini Interactions API returns
    model output inside steps.
  */

  let text =
    "";


  if (
    Array.isArray(
      data.steps
    )
  ) {

    for (
      const step of data.steps
    ) {

      if (
        step.type !==
          "model_output" ||
        !Array.isArray(
          step.content
        )
      ) {

        continue;

      }


      for (
        const content of step.content
      ) {

        if (
          content.type ===
            "text" &&
          typeof content.text ===
            "string"
        ) {

          text +=
            content.text;

        }

      }

    }

  }


  /*
    Secondary response format.
  */

  if (
    !text &&
    typeof data.output_text ===
      "string"
  ) {

    text =
      data.output_text;

  }


  const finalText =
    limitWords(
      text,
      10
    );


  if (!finalText) {

    throw new Error(
      "Gemini returned an empty editorial signal."
    );

  }


  return finalText;

}


/* ============================================================
   FALLBACK
============================================================ */

function fallbackSignal() {

  /*
    Use localStorage-like rotation through
    a server-side time bucket.

    This means successive requests don't
    always return the first sentence.
  */

  const minute =
    Math.floor(
      Date.now() /
      60000
    );


  const index =
    minute %
    FALLBACK_SIGNALS.length;


  return {

    text:
      FALLBACK_SIGNALS[index].text,

    theme:
      FALLBACK_SIGNALS[index].theme,

    source:
      "fallback"

  };

}


/* ============================================================
   RESPONSE
============================================================ */

function sendJSON(
  res,
  status,
  payload
) {

  res
    .status(status)
    .setHeader(
      "Cache-Control",
      "no-store, max-age=0"
    )
    .json(
      payload
    );

}


/* ============================================================
   API HANDLER
============================================================ */

export default async function handler(
  req,
  res
) {

  /*
    GET only.
  */

  if (
    req.method !==
    "GET"
  ) {

    return sendJSON(
      res,
      405,
      {
        error:
          "GET only"
      }
    );

  }


  try {

    /*
      Collect current AI signals.
    */

    const items =
      await collectSignals();


    /*
      If the news layer works,
      create an editorial interpretation.
    */

    if (items.length) {

      const selected =
        selectSignal(
          items
        );


      if (selected) {

        try {

          const editorial =
            await generateEditorialSignal(
              selected
            );


          return sendJSON(
            res,
            200,
            {

              text:
                editorial,

              theme:
                selected.theme,

              source:
                "live",

              timestamp:
                new Date()
                  .toISOString()

            }
          );


        } catch (
          editorialError
        ) {

          console.error(
            "ACI editorial generation failed:",
            editorialError?.message
          );

          /*
            Do not fail the UI simply because
            the editorial model is unavailable.
          */

        }

      }

    }


    /*
      Fallback.
    */

    const fallback =
      fallbackSignal();


    return sendJSON(
      res,
      200,
      {

        text:
          fallback.text,

        theme:
          fallback.theme,

        source:
          fallback.source,

        timestamp:
          new Date()
            .toISOString()

      }
    );


  } catch (error) {

    console.error(
      "ACI insight error:",
      error
    );


    /*
      Even if everything external fails,
      return a valid response so the frontend
      never breaks.
    */

    const fallback =
      fallbackSignal();


    return sendJSON(
      res,
      200,
      {

        text:
          fallback.text,

        theme:
          fallback.theme,

        source:
          fallback.source,

        timestamp:
          new Date()
            .toISOString()

      }
    );

  }

}
