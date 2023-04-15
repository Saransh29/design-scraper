// Import required libraries
const express = require("express");
const puppeteer = require("puppeteer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");

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
  scrapeWebsite(url, taskId).then((result) => {
    tasks[taskId].status = "completed";
    tasks[taskId].progress = 100;
    tasks[taskId].result = result;
  });

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
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);

  const result = {
    design: {},
    template: {},
  };
  console.log(page);

  // Extract design and template information
  result.design.html = await page.content();
  result.design.css = await extractCSS(page);

  // Save extracted assets to disk
  await saveAssets(result.design);

  // Generate template
  result.template = generateTemplate(result.design);

  await browser.close();
  return result;
};

const extractCSS = async (page) => {
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
};

const saveAssets = async (design) => {
  const assetDir = path.join(__dirname, "assets");
  fs.mkdirSync(assetDir, { recursive: true });

  fs.writeFileSync(path.join(assetDir, "index.html"), design.html);
  fs.writeFileSync(path.join(assetDir, "styles.css"), design.css);
};

const generateTemplate = (design) => {
  // Implement template generation logic here
  return {
    html: design.html,
    css: design.css,
  };
};

// Start the server
const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server listening on port http://localhost:${port}`);
});
