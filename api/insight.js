/* =========================================================
   ACI DYNAMIC AI / TECHNOLOGY INSIGHT
   =========================================================

   Purpose:

   Employee opens a new conversation
          ↓
   /api/insight
          ↓
   Fresh technology / AI signal
          ↓
   Short original thought
          ↓
   Employee UI

   This endpoint does NOT expose API keys.
========================================================= */


const FALLBACKS = [

  {
    category: "AI economics",
    title:
      "AI is becoming cheaper to use. That does not mean companies are becoming better at using it."
  },

  {
    category: "Enterprise AI",
    title:
      "The next enterprise AI problem may not be model capability. It may be knowing where every AI request is going."
  },

  {
    category: "AI infrastructure",
    title:
      "Every AI answer has an infrastructure bill hiding behind it."
  },

  {
    category: "AI agents",
    title:
      "When AI agents start acting instead of answering, the economics of every decision become much more important."
  },

  {
    category: "AI strategy",
    title:
      "Giving employees more AI does not automatically create more productivity. The workflow around the AI matters."
  },

  {
    category: "Model economics",
    title:
      "If two models can solve the same task, why should the company always pay for the more expensive one?"
  },

  {
    category: "Enterprise software",
    title:
      "AI is quietly turning software from a license expense into a consumption expense."
  },

  {
    category: "AI adoption",
    title:
      "The interesting question is no longer whether employees use AI. It is what happens after they start using it everywhere."
  },

  {
    category: "AI infrastructure",
    title:
      "Inference happens one request at a time. Enterprise AI economics happen millions of requests later."
  },

  {
    category: "Technology",
    title:
      "Every new AI model creates more capability. It also creates another routing decision."
  },

  {
    category: "AI productivity",
    title:
      "The fastest AI answer is not always the most valuable one. The cheapest useful answer might be."
  },

  {
    category: "AI security",
    title:
      "The more AI becomes part of everyday work, the harder it becomes to separate convenience from data risk."
  },

  {
    category: "AI governance",
    title:
      "Enterprise AI governance cannot stop at asking which models employees are allowed to use."
  },

  {
    category: "AI agents",
    title:
      "An AI agent that can execute a task changes the question from 'Can it answer?' to 'Should it act?'"
  },

  {
    category: "AI markets",
    title:
      "AI competition is moving beyond intelligence. Price, latency, availability and reliability are becoming weapons too."
  },

  {
    category: "AI economics",
    title:
      "A thousand cheap AI requests can matter more financially than one expensive experiment."
  },

  {
    category: "Enterprise AI",
    title:
      "Most companies will eventually need an AI layer between employees and models."
  },

  {
    category: "AI infrastructure",
    title:
      "The model is only one component of an AI system. The economics live across the entire request."
  },

  {
    category: "Technology",
    title:
      "What happens when choosing an AI model becomes as dynamic as choosing a cloud server?"
  },

  {
    category: "AI strategy",
    title:
      "The winning enterprise AI architecture may be the one that knows when not to use the most powerful model."
  },

  {
    category: "AI adoption",
    title:
      "AI adoption becomes a finance problem the moment experimentation becomes habitual."
  },

  {
    category: "AI economics",
    title:
      "If AI becomes infrastructure, someone eventually has to build the meter."
  },

  {
    category: "AI infrastructure",
    title:
      "GPU capacity is physical. AI demand is behavioral. The economics sit between the two."
  },

  {
    category: "AI productivity",
    title:
      "Saving ten minutes per employee sounds small until thousands of employees start doing it every day."
  },

  {
    category: "Enterprise AI",
    title:
      "The future enterprise AI stack may have an economic control plane sitting above the models."
  },

  {
    category: "AI governance",
    title:
      "A policy that says 'use approved AI' answers who can use AI. It does not answer how efficiently they use it."
  },

  {
    category: "Model economics",
    title:
      "Model prices are falling. The number of things companies want models to do is rising."
  },

  {
    category: "AI agents",
    title:
      "An AI agent can multiply productivity. It can also multiply consumption."
  },

  {
    category: "AI infrastructure",
    title:
      "Latency is a user experience metric. At enterprise scale, it becomes an economic metric too."
  },

  {
    category: "Technology",
    title:
      "The model that wins a benchmark is not necessarily the model that wins a company's workload."
  },

  {
    category: "AI economics",
    title:
      "The right AI question may be less 'Which model is smartest?' and more 'Which model is sufficient?'"
  },

  {
    category: "Enterprise AI",
    title:
      "AI spend becomes difficult to control when employees experience it as free."
  },

  {
    category: "AI security",
    title:
      "An AI request can carry more information than its final answer reveals."
  },

  {
    category: "AI strategy",
    title:
      "Enterprise AI is becoming a portfolio problem: capability, cost, risk, speed and reliability."
  },

  {
    category: "AI markets",
    title:
      "As model capabilities converge on everyday tasks, economics could become the differentiator."
  },

  {
    category: "AI adoption",
    title:
      "The biggest AI transformation may happen quietly inside thousands of ordinary workflows."
  },

  {
    category: "AI infrastructure",
    title:
      "AI consumption has no office building, no electricity meter and no obvious queue. Yet it still creates a bill."
  },

  {
    category: "Enterprise AI",
    title:
      "What if employees never had to know which AI model was answering them?"
  },

  {
    category: "AI economics",
    title:
      "A good AI system should know when a simple task deserves a simple model."
  },

  {
    category: "Technology",
    title:
      "Software used to hide hardware complexity. AI may do the same for intelligence itself."
  },

  {
    category: "AI agents",
    title:
      "Once AI can call tools, APIs and other models, routing becomes a system design problem."
  },

  {
    category: "AI productivity",
    title:
      "The value of AI is rarely the answer alone. It is the work that disappears after the answer."
  },

  {
    category: "AI governance",
    title:
      "AI governance will eventually need dashboards that finance teams can understand."
  },

  {
    category: "Model economics",
    title:
      "The cheapest model is not always the right model. The interesting problem is finding the cheapest model that works."
  },

  {
    category: "Enterprise AI",
    title:
      "Companies are buying intelligence before they have built a way to measure its consumption."
  },

  {
    category: "AI infrastructure",
    title:
      "Every model request has a price. Every unnecessary request has an opportunity cost."
  },

  {
    category: "AI strategy",
    title:
      "AI transformation is becoming less about adding another chatbot and more about redesigning how work moves."
  },

  {
    category: "Technology",
    title:
      "The interface may hide the model completely. The economics cannot stay hidden forever."
  },

  {
    category: "AI economics",
    title:
      "What would happen if every AI request had to justify its own cost?"
  },

  {
    category: "AI agents",
    title:
      "The more autonomous AI becomes, the more important failure recovery becomes."
  },

  {
    category: "Enterprise AI",
    title:
      "The next generation of enterprise software may route intelligence the way networks route traffic."
  },

  {
    category: "AI infrastructure",
    title:
      "Model availability is becoming part of application reliability."
  },

  {
    category: "AI economics",
    title:
      "AI cost optimization should happen before the bill arrives, not after finance discovers it."
  },

  {
    category: "AI strategy",
    title:
      "An enterprise should not need every employee to become an AI infrastructure expert."
  },

  {
    category: "Technology",
    title:
      "AI is turning the question 'What software should we buy?' into 'What intelligence should we consume?'"
  }

];


/* =========================================================
   GOOGLE NEWS RSS
========================================================= */

const FEEDS = [

  {
    category: "AI / Technology",
    url:
      "https://news.google.com/rss/search?q=artificial+intelligence+AI+technology&hl=en-IN&gl=IN&ceid=IN:en"
  },

  {
    category: "AI infrastructure",
    url:
      "https://news.google.com/rss/search?q=AI+infrastructure+GPU+inference+data+center&hl=en-IN&gl=IN&ceid=IN:en"
  },

  {
    category: "Enterprise AI",
    url:
      "https://news.google.com/rss/search?q=enterprise+AI+business+companies&hl=en-IN&gl=IN&ceid=IN:en"
  },

  {
    category: "AI agents",
    url:
      "https://news.google.com/rss/search?q=AI+agents+automation&hl=en-IN&gl=IN&ceid=IN:en"
  }

];


/* =========================================================
   RANDOM
========================================================= */

function randomItem(
  array
) {

  return array[
    Math.floor(
      Math.random() *
      array.length
    )
  ];

}


/* =========================================================
   XML HELPERS
========================================================= */

function decodeEntities(
  value
) {

  return String(value || "")

    .replace(
      /<!\[CDATA\[([\s\S]*?)\]\]>/g,
      "$1"
    )

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
    );

}


function cleanText(
  value
) {

  return decodeEntities(
    value
  )
    .replace(
      /<[^>]*>/g,
      ""
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();

}


/* =========================================================
   RSS PARSER
========================================================= */

function parseRSS(
  xml
) {

  const items = [];

  const matches =
    xml.match(
      /<item[\s\S]*?<\/item>/gi
    ) || [];


  for (
    const item of matches
  ) {

    const titleMatch =
      item.match(
        /<title>([\s\S]*?)<\/title>/i
      );


    const linkMatch =
      item.match(
        /<link>([\s\S]*?)<\/link>/i
      );


    const dateMatch =
      item.match(
        /<pubDate>([\s\S]*?)<\/pubDate>/i
      );


    if (
      !titleMatch
    ) {

      continue;

    }


    const title =
      cleanText(
        titleMatch[1]
      );


    const link =
      cleanText(
        linkMatch?.[1] ||
        ""
      );


    const published =
      dateMatch?.[1]
        ? new Date(
            cleanText(
              dateMatch[1]
            )
          )
        : null;


    items.push({

      title,

      link,

      published:
        published &&
        !Number.isNaN(
          published.getTime()
        )
          ? published
          : null

    });

  }


  return items;

}


/* =========================================================
   FETCH FEED
========================================================= */

async function fetchFeed(
  feed
) {

  const response =
    await fetch(
      feed.url,
      {
        headers: {
          "User-Agent":
            "ACI-Insight/1.0"
        }
      }
    );


  if (!response.ok) {

    throw new Error(
      `RSS returned ${response.status}`
    );

  }


  const xml =
    await response.text();


  const items =
    parseRSS(
      xml
    );


  return items
    .slice(
      0,
      12
    )
    .map(
      item => ({
        ...item,
        category:
          feed.category
      })
    );

}


/* =========================================================
   CREATE ORIGINAL THOUGHT
========================================================= */

function createThought(
  headline
) {

  const title =
    cleanText(
      headline
    );


  /*
   * We deliberately do NOT copy the headline
   * into the employee UI.
   *
   * We create a short original editorial
   * observation from the topic.
   */


  const lower =
    title.toLowerCase();


  if (
    lower.includes("agent")
  ) {

    return {
      title:
        "AI agents are moving from answering questions toward doing work. That makes reliability, permissions and consumption part of the same problem.",
      category:
        "AI agents"
    };

  }


  if (
    lower.includes("gpu") ||
    lower.includes("data center") ||
    lower.includes("datacenter") ||
    lower.includes("infrastructure")
  ) {

    return {
      title:
        "AI demand eventually becomes an infrastructure problem. Behind every prompt is hardware, electricity, networking and inference capacity.",
      category:
        "AI infrastructure"
    };

  }


  if (
    lower.includes("enterprise") ||
    lower.includes("company") ||
    lower.includes("business")
  ) {

    return {
      title:
        "Enterprise AI is moving beyond experimentation. The harder question is how companies control thousands of AI decisions without slowing employees down.",
      category:
        "Enterprise AI"
    };

  }


  if (
    lower.includes("model") ||
    lower.includes("llm")
  ) {

    return {
      title:
        "Every new AI model adds capability and another economic choice. The interesting system is the one that knows which capability a task actually needs.",
      category:
        "Model economics"
    };

  }


  if (
    lower.includes("cost") ||
    lower.includes("price") ||
    lower.includes("pricing")
  ) {

    return {
      title:
        "AI pricing is changing quickly. For companies, the bigger question is how those prices behave across millions of real requests.",
      category:
        "AI economics"
    };

  }


  if (
    lower.includes("security") ||
    lower.includes("cyber")
  ) {

    return {
      title:
        "AI adoption is also expanding the security boundary. More useful AI means more decisions about what information can safely enter the system.",
      category:
        "AI security"
    };

  }


  /*
   * Generic AI signal
   */

  return {

    title:
      "AI keeps moving into new parts of the technology stack. The next challenge is turning that capability into something useful, measurable and economically sensible.",

    category:
      "AI / Technology"

  };

}


/* =========================================================
   RECENTLY USED TITLES
========================================================= */

function recentlyUsed(
  title
) {

  /*
   * This is intentionally kept server-local.
   *
   * Vercel instances are ephemeral, so this is
   * only an additional anti-repeat mechanism.
   */

  return false;

}


/* =========================================================
   MAIN HANDLER
========================================================= */

export default async function handler(
  req,
  res
) {

  if (
    req.method !== "GET"
  ) {

    return res
      .status(405)
      .json({
        error:
          "GET only"
      });

  }


  try {

    /*
     * Fetch several feeds concurrently.
     */

    const results =
      await Promise.allSettled(

        FEEDS.map(
          feed =>
            fetchFeed(
              feed
            )
        )

      );


    let allItems = [];


    results.forEach(
      result => {

        if (
          result.status ===
          "fulfilled"
        ) {

          allItems =
            allItems.concat(
              result.value
            );

        }

      }
    );


    /*
     * Remove empty / duplicate headlines.
     */

    const unique =
      Array.from(
        new Map(
          allItems.map(
            item => [
              item.title,
              item
            ]
          )
        ).values()
      );


    /*
     * Prefer recent items.
     */

    const now =
      Date.now();


    const recent =
      unique.filter(
        item => {

          if (
            !item.published
          ) {

            return true;

          }


          const age =
            now -
            item.published.getTime();


          return (
            age >= 0 &&
            age <=
              7 *
              24 *
              60 *
              60 *
              1000
          );

        }
      );


    const candidates =
      recent.length
        ? recent
        : unique;


    if (
      candidates.length
    ) {

      const selected =
        randomItem(
          candidates
        );


      const thought =
        createThought(
          selected.title
        );


      return res
        .status(200)
        .json({

          title:
            thought.title,

          category:
            thought.category,

          sourceName:
            "Google News",

          sourceUrl:
            selected.link || null,

          published:
            selected.published
              ? selected.published
                  .toISOString()
              : null,

          live:
            true

        });

    }


    /*
     * Internet source unavailable.
     * Use original internal thought.
     */

    const fallback =
      randomItem(
        FALLBACKS
      );


    return res
      .status(200)
      .json({

        title:
          fallback.title,

        category:
          fallback.category,

        sourceName:
          null,

        sourceUrl:
          null,

        published:
          null,

        live:
          false

      });


  } catch (error) {

    console.error(
      "ACI insight error:",
      error
    );


    const fallback =
      randomItem(
        FALLBACKS
      );


    return res
      .status(200)
      .json({

        title:
          fallback.title,

        category:
          fallback.category,

        sourceName:
          null,

        sourceUrl:
          null,

        published:
          null,

        live:
          false

      });

  }

}
