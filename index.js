// Import required libraries
const express = require("express");
const puppeteer = require("puppeteer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

// Initialize the Express app
const app = express();
app.use(express.json());

// Define a global object to store task information
const tasks = {};

// POST /scrape endpoint
app.post("/scrape", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  const taskId = uuidv4();
  tasks[taskId] = {
    status: "in_progress",
    progress: 0,
    result: null,
  };

  // Launch the scraper in a separate asynchronous function
  try {
    await scrapeWebsite(url, taskId);
    tasks[taskId].status = "completed";
    tasks[taskId].progress = 100;
  } catch (err) {
    tasks[taskId].status = "failed";
    tasks[taskId].error = err.message;
  }

  res.json({ taskId });
});

// GET /status/:taskId endpoint
app.get("/status/:taskId", (req, res) => {
  const { taskId } = req.params;
  if (!tasks[taskId]) {
    return res.status(404).json({ error: "Task not found" });
  }

  res.json(tasks[taskId]);
});

// GET /result/:taskId endpoint
app.get("/result/:taskId", (req, res) => {
  const { taskId } = req.params;
  if (!tasks[taskId]) {
    return res.status(404).json({ error: "Task not found" });
  }

  if (tasks[taskId].status !== "completed") {
    return res.status(400).json({ error: "Task not completed yet" });
  }

  res.json(tasks[taskId].result);
});

const scrapeWebsite = async (url, taskId) => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    const result = {
      design: {},
      template: {},
    };

    // Extract design and template information
    result.design.html = await page.content();
    result.design.css = await extractCSS(page);

    // Generate template
    result.template = generateTemplate(result.design);

    // Save extracted assets to disk
    await saveAssets(url, result.design, result.template);

    tasks[taskId].result = result;
    await browser.close();
  } catch (err) {
    console.error(`Error scraping website: ${url}`, err);
    throw err;
  }
};

const extractCSS = async (page) => {
  try {
    const cssLinks = await page.$$eval('link[rel="stylesheet"]', (links) =>
      links.map((link) => link.href)
    );

    const cssTexts = await page.evaluate(async (cssLinks) => {
      const cssFetchPromises = cssLinks.map(async (link) => {
        try {
          const response = await fetch(link);
          if (response.ok) {
            return await response.text();
          }
        } catch (err) {
          console.error(`Failed to fetch CSS from ${link}:`, err.message);
        }
        return null;
      });

      return await Promise.all(cssFetchPromises);
    }, cssLinks);

    return cssTexts.filter((css) => css !== null).join("\n");
  } catch (err) {
    console.error("Error extracting CSS", err);
    throw err;
  }
};

const removeScriptTags = (html) => {
  try {
    return html.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ""
    );
  } catch (err) {
    console.error("Error removing script tags", err);
    throw err;
  }
};
const saveAssets = async (url, design, template) => {
  try {
    // Sanitize the URL to create a valid folder name
    const folderName = url
      .replace(/(^\w+:|^)\/\//, "")
      .replace(/[^\w\d]+/g, "_");

    const assetDir = path.join(__dirname, "assets", folderName);
    fs.mkdirSync(assetDir, { recursive: true });

    // Remove script tags from the HTML
    const htmlWithoutScripts = removeScriptTags(design.html);

    // Add the link tag for the styles.css file
    const linkTag =
      '<link rel="stylesheet" type="text/css" href="styles.css" />';
    const htmlWithStyles = htmlWithoutScripts.replace(
      "</head>",
      `${linkTag}</head>`
    );

    fs.writeFileSync(path.join(assetDir, "index.html"), htmlWithStyles);
    fs.writeFileSync(path.join(assetDir, "styles.css"), design.css);

    fs.writeFileSync(path.join(assetDir, "template.html"), template.html);
    fs.writeFileSync(path.join(assetDir, "template.css"), template.css);
  } catch (err) {
    console.error("Error saving assets", err);
    throw err;
  }
};

const generateTemplate = (design) => {
  try {
    const { window } = new JSDOM(design.html);
    const { document } = window;

    // Remove unnecessary attributes from elements
    const elements = document.querySelectorAll("*");
    elements.forEach((element) => {
      element.removeAttribute("id");
      element.removeAttribute("class");
      Array.from(element.attributes).forEach((attr) => {
        if (attr.name.startsWith("data-")) {
          element.removeAttribute(attr.name);
        }
      });
    });

    const navElements = document.querySelectorAll("nav");
    navElements.forEach((nav) => {
      const templateTag = document.createTextNode("{{navigation}}");
      nav.parentNode.replaceChild(templateTag, nav);
    });

    const template = {
      html: document.documentElement.outerHTML,
      css: design.css,
    };

    return template;
  } catch (err) {
    console.error("Error generating template", err);
    throw err;
  }
};

// Start the server
const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server listening on port http://localhost:${port}`);
});
