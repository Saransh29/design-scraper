// Import required libraries
const express = require("express");
const puppeteer = require("puppeteer");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const cors = require("cors");

// Initialize the Express app
const app = express();
app.use(express.json());

app.use(cors());
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

app.post("/dummy", async (req, res) => {
  const { url } = req.body;
  const resp = {
    scraped: {
      design: {
        html: '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="/_next/static/css/820a62dc2f01c73c.css" data-precedence="high"><link href="https://www.googletagmanager.com/gtag/js?id=G-PGDWX7WDQH" rel="preload" as="script"><meta property="og:url" content="https://ai-builder-gules.vercel.app/"><meta property="og:type" content="website"><meta property="og:title" content="Ai Builder"><meta property="og:description" content="Generate full websites with AI, in less than 1 minute. Powered by ChatGPT"><meta property="og:image" content="https://ai-builder-gules.vercel.app/image.png"><meta property="og:image:alt" content="Generate full websites with AI, in less than 1 minute. Powered by ChatGPT"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><header class="w-full mx-auto px-4 sm:px-20 fixed top-0 z-50 bg-transparent shadow dark:backdrop-blur"><div class="justify-between md:items-center md:flex"><div><div class="flex items-center justify-between py-3 md:py-3 md:block"><div class="md:py-1 md:block"><h2 class="text-4xl font-bold text-inherit "><a href="/beta">Ai Builder</a></h2></div><div class="md:hidden"><button><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 512 512" class=" fill-black " height="30" width="30" xmlns="http://www.w3.org/2000/svg"><path d="M64 384h384v-42.666H64V384zm0-106.666h384v-42.667H64v42.667zM64 128v42.665h384V128H64z"></path></svg></button></div></div></div><div><div class="flex-1 justify-self-center pb-3 mt-8 md:block md:pb-0 md:mt-0  hidden"><div class="items-center justify-center space-y-8 md:flex md:space-x-6 md:space-y-0"><a href="about" class="block lg:inline-block text-inherit  cursor-pointer" offset="-100" duration="500">About</a><a href="community" class="block lg:inline-block text-inherit  cursor-pointer" offset="-100" duration="500">Community</a><div class="flex flex-col"><button id="dropdownDefaultButton" data-dropdown-toggle="dropdown" class="text-white bg-blue-700 hover:bg-blue-800 font-medium rounded-lg text-sm px-4 py-2.5 text-center inline-flex items-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800" type="button">Account<!-- --> <svg class="w-4 h-4 ml-2" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg></button><div id="dropdown" class=" mt-10 absolute z-10  bg-white divide-y divide-gray-100 rounded-lg shadow w-44 dark:bg-gray-700  hidden"><ul class="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="dropdownDefaultButton"><div><div class=" px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"><button type="button"><div class="flex flex-row w-full px-4 justify-between items-center"><p class="pr-2">Sign In with </p><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 1024 1024" class="hover:-translate-y-1 transition-transform cursor-pointer text-neutral-500 dark:text-neutral-400" height="30" width="30" xmlns="http://www.w3.org/2000/svg"><path d="M511.6 76.3C264.3 76.2 64 276.4 64 523.5 64 718.9 189.3 885 363.8 946c23.5 5.9 19.9-10.8 19.9-22.2v-77.5c-135.7 15.9-141.2-73.9-150.3-88.9C215 726 171.5 718 184.5 703c30.9-15.9 62.4 4 98.9 57.9 26.4 39.1 77.9 32.5 104 26 5.7-23.5 17.9-44.5 34.7-60.8-140.6-25.2-199.2-111-199.2-213 0-49.5 16.3-95 48.3-131.7-20.4-60.5 1.9-112.3 4.9-120 58.1-5.2 118.5 41.6 123.2 45.3 33-8.9 70.7-13.6 112.9-13.6 42.4 0 80.2 4.9 113.5 13.9 11.3-8.6 67.3-48.8 121.3-43.9 2.9 7.7 24.7 58.3 5.5 118 32.4 36.8 48.9 82.7 48.9 132.3 0 102.2-59 188.1-200 212.9a127.5 127.5 0 0 1 38.1 91v112.5c.8 9 0 17.9 15 17.9 177.1-59.7 304.6-227 304.6-424.1 0-247.2-200.4-447.3-447.5-447.3z"></path></svg></div></button></div><div class=" px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white"><button type="button"><div class="flex flex-row w-full px-4 justify-between items-center"><p class="pr-2">Sign In with </p><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 1024 1024" class="hover:-translate-y-1 transition-transform cursor-pointer text-neutral-500 dark:text-neutral-400" height="30" width="30" xmlns="http://www.w3.org/2000/svg"><path d="M881 442.4H519.7v148.5h206.4c-8.9 48-35.9 88.6-76.6 115.8-34.4 23-78.3 36.6-129.9 36.6-99.9 0-184.4-67.5-214.6-158.2-7.6-23-12-47.6-12-72.9s4.4-49.9 12-72.9c30.3-90.6 114.8-158.1 214.7-158.1 56.3 0 106.8 19.4 146.6 57.4l110-110.1c-66.5-62-153.2-100-256.6-100-149.9 0-279.6 86-342.7 211.4-26 51.8-40.8 110.4-40.8 172.4S151 632.8 177 684.6C240.1 810 369.8 896 519.7 896c103.6 0 190.4-34.4 253.8-93 72.5-66.8 114.4-165.2 114.4-282.1 0-27.2-2.4-53.3-6.9-78.5z"></path></svg></div></button></div></div></ul></div></div></div></div></div></div></header><div class="flex flex-col h-screen"><div class="h-20"></div><div class="flex-grow px-2 place-items-center "><div class="flex mx-auto flex-col items-center justify-center pt-32 py-2 min-h-screen bg-gradient-to-b from-[#dbf4ff] to-[#fff1f1]"><div style="display:flex;height:100%;width:100%;align-items:center;justify-content:center;flex-direction:column;font-size:60px;letter-spacing:-2px;font-weight:700;text-align:center"><div style="background-image:linear-gradient(90deg, rgb(0, 124, 240), rgb(0, 223, 216));background-clip:text;-webkit-background-clip:text;color:transparent">Build Websites with AI</div><div style="height:10px"></div><div style="background-image:linear-gradient(90deg, rgb(121, 40, 202), rgb(255, 0, 128));background-clip:text;-webkit-background-clip:text;color:transparent">in &lt; 1min</div><div style="height:10px"></div><div style="background-image:linear-gradient(90deg, rgb(255, 77, 77), rgb(249, 203, 40));background-clip:text;-webkit-background-clip:text;color:transparent;font-size:25">powered by ChatGPT-3.5-turbo</div></div><main class="flex flex-1 p-10 w-full flex-col items-center justify-center text-center px-4 mt-4 sm:mb-0 mb-8"><div> <div class="h-[250px] flex flex-col items-center space-y-6 max-w-[670px] -mt-8"><div class="max-w-xl text-gray-500">Sign in to save your creations.</div><div class="flex flex-row space-x-4 "><button class="text-2xl bg-gray-200 text-black font-semibold py-3 px-6 rounded-2xl flex items-center space-x-2"><div style="background-image:linear-gradient(90deg, rgb(0, 124, 240), rgb(0, 223, 216));background-clip:text;-webkit-background-clip:text;color:transparent">Sign in with<!-- --> </div><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 1024 1024" class="hover:-translate-y-1 transition-transform cursor-pointer text-neutral-500 dark:text-neutral-400" height="30" width="30" xmlns="http://www.w3.org/2000/svg"><path d="M881 442.4H519.7v148.5h206.4c-8.9 48-35.9 88.6-76.6 115.8-34.4 23-78.3 36.6-129.9 36.6-99.9 0-184.4-67.5-214.6-158.2-7.6-23-12-47.6-12-72.9s4.4-49.9 12-72.9c30.3-90.6 114.8-158.1 214.7-158.1 56.3 0 106.8 19.4 146.6 57.4l110-110.1c-66.5-62-153.2-100-256.6-100-149.9 0-279.6 86-342.7 211.4-26 51.8-40.8 110.4-40.8 172.4S151 632.8 177 684.6C240.1 810 369.8 896 519.7 896c103.6 0 190.4-34.4 253.8-93 72.5-66.8 114.4-165.2 114.4-282.1 0-27.2-2.4-53.3-6.9-78.5z"></path></svg></button><button class="text-2xl bg-gray-200 text-black font-semibold py-3 px-6 rounded-2xl flex items-center space-x-2"><div style="background-image:linear-gradient(90deg, rgb(0, 124, 240), rgb(0, 223, 216));background-clip:text;-webkit-background-clip:text;color:transparent">Sign in with<!-- --> </div><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 1024 1024" class="hover:-translate-y-1 transition-transform cursor-pointer text-neutral-500 dark:text-neutral-400" height="30" width="30" xmlns="http://www.w3.org/2000/svg"><path d="M511.6 76.3C264.3 76.2 64 276.4 64 523.5 64 718.9 189.3 885 363.8 946c23.5 5.9 19.9-10.8 19.9-22.2v-77.5c-135.7 15.9-141.2-73.9-150.3-88.9C215 726 171.5 718 184.5 703c30.9-15.9 62.4 4 98.9 57.9 26.4 39.1 77.9 32.5 104 26 5.7-23.5 17.9-44.5 34.7-60.8-140.6-25.2-199.2-111-199.2-213 0-49.5 16.3-95 48.3-131.7-20.4-60.5 1.9-112.3 4.9-120 58.1-5.2 118.5 41.6 123.2 45.3 33-8.9 70.7-13.6 112.9-13.6 42.4 0 80.2 4.9 113.5 13.9 11.3-8.6 67.3-48.8 121.3-43.9 2.9 7.7 24.7 58.3 5.5 118 32.4 36.8 48.9 82.7 48.9 132.3 0 102.2-59 188.1-200 212.9a127.5 127.5 0 0 1 38.1 91v112.5c.8 9 0 17.9 15 17.9 177.1-59.7 304.6-227 304.6-424.1 0-247.2-200.4-447.3-447.5-447.3z"></path></svg></button></div><div><a href="/beta" class="text-3xl bg-gray-200 font-semibold py-6 px-6 rounded-2xl flex items-center space-x-4"><div style="background-image:linear-gradient(90deg,rgb(121, 40, 202), rgb(255, 0, 128));background-clip:text;-webkit-background-clip:text;color:transparent">Checkout beta Now (2x faster and better)</div></a></div></div></div></main><footer class=" w-full mx-auto max-w-3xl px-4 sm:px-6 md:max-w-5xl "><hr class="w-full h-0.5 mx-auto mt-8 bg-neutral-200 border-0"><div class="mx-auto p-4 flex flex-col text-center text-black md:flex-row md:justify-between"><div class="flex flex-row items-center justify-center space-x-1 text-black">© 2023 Saransh Bibiyan<a href="https://saransh.me" class="hover:underline"></a></div><div class="flex flex-row items-center justify-center space-x-2 mb-1"><a href="https://github.com/Saransh29" rel="noreferrer" target="_blank"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 1024 1024" class="hover:-translate-y-1 transition-transform cursor-pointer text-black" height="30" width="30" xmlns="http://www.w3.org/2000/svg"><path d="M511.6 76.3C264.3 76.2 64 276.4 64 523.5 64 718.9 189.3 885 363.8 946c23.5 5.9 19.9-10.8 19.9-22.2v-77.5c-135.7 15.9-141.2-73.9-150.3-88.9C215 726 171.5 718 184.5 703c30.9-15.9 62.4 4 98.9 57.9 26.4 39.1 77.9 32.5 104 26 5.7-23.5 17.9-44.5 34.7-60.8-140.6-25.2-199.2-111-199.2-213 0-49.5 16.3-95 48.3-131.7-20.4-60.5 1.9-112.3 4.9-120 58.1-5.2 118.5 41.6 123.2 45.3 33-8.9 70.7-13.6 112.9-13.6 42.4 0 80.2 4.9 113.5 13.9 11.3-8.6 67.3-48.8 121.3-43.9 2.9 7.7 24.7 58.3 5.5 118 32.4 36.8 48.9 82.7 48.9 132.3 0 102.2-59 188.1-200 212.9a127.5 127.5 0 0 1 38.1 91v112.5c.8 9 0 17.9 15 17.9 177.1-59.7 304.6-227 304.6-424.1 0-247.2-200.4-447.3-447.5-447.3z"></path></svg></a><a href="https://www.linkedin.com/in/saransh-bibiyan/" rel="noreferrer" target="_blank"><svg stroke="currentColor" fill="currentColor" stroke-width="0" viewBox="0 0 1024 1024" class="hover:-translate-y-1 transition-transform cursor-pointer text-black" height="30" width="30" xmlns="http://www.w3.org/2000/svg"><path d="M847.7 112H176.3c-35.5 0-64.3 28.8-64.3 64.3v671.4c0 35.5 28.8 64.3 64.3 64.3h671.4c35.5 0 64.3-28.8 64.3-64.3V176.3c0-35.5-28.8-64.3-64.3-64.3zm0 736c-447.8-.1-671.7-.2-671.7-.3.1-447.8.2-671.7.3-671.7 447.8.1 671.7.2 671.7.3-.1 447.8-.2 671.7-.3 671.7zM230.6 411.9h118.7v381.8H230.6zm59.4-52.2c37.9 0 68.8-30.8 68.8-68.8a68.8 68.8 0 1 0-137.6 0c-.1 38 30.7 68.8 68.8 68.8zm252.3 245.1c0-49.8 9.5-98 71.2-98 60.8 0 61.7 56.9 61.7 101.2v185.7h118.6V584.3c0-102.8-22.2-181.9-142.3-181.9-57.7 0-96.4 31.7-112.3 61.7h-1.6v-52.2H423.7v381.8h118.6V604.8z"></path></svg></a></div></div></footer></div></div></div><div class="p-4 m-2"><div class="fixed bottom-0 right-0 md:visible invisible backdrop-blur rounded-xl"><div class=" m-2 p-5 rounded-xl flex flex-row items-center justify-center space-x-2 mb-1"><a class="hover:-translate-y-1 transition-transform cursor-pointer" rel="noreferrer" target="_blank" href="https://github.com/Saransh29/ai-builder"><div class="flex flex-row justify-center items-center rounded-xl bg-gray-200"> <p class="p-2 text-2xl"> Star on Github</p><svg height="32" area-hidden="true" viewBox="0 0 16 16" version="1.1" width="32" data-view-component="true" class="octicon octicon-mark-github v-align-middle"><path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path></svg></div></a></div></div></div><script src="/_next/static/chunks/webpack-77626c319c0ba323.js" async=""></script><script src="/_next/static/chunks/166-2312eb4d29d1600f.js" async=""></script><script src="/_next/static/chunks/main-app-8b742df4654db42b.js" async=""></script><script>(self.__next_f=self.__next_f||[]).push([0])</script><script>self.__next_f.push([1,"J0:\\"@1\\"\\n"])</script><script>self.__next_f.push([1,"M2:{\\"id\\":\\"8186\\",\\"name\\":\\"\\",\\"chunks\\":[\\"272:webpack-77626c319c0ba323\\",\\"166:166-2312eb4d29d1600f\\",\\"744:main-app-8b742df4654db42b\\"],\\"async\\":false}\\nM4:{\\"id\\":\\"9979\\",\\"name\\":\\"\\",\\"chunks\\":[\\"272:webpack-77626c319c0ba323\\",\\"166:166-2312eb4d29d1600f\\",\\"744:main-app-8b742df4654db42b\\"],\\"async\\":false}\\nM5:{\\"id\\":\\"4102\\",\\"chunks\\":[\\"292:2920303b-7f3358b99f0055a1\\",\\"22:65da014a-80c2c0d41359c55e\\",\\"769:769-2db59afba13d4a14\\",\\"185:app/layout-b19d37aef29e298d\\"],\\"name\\":\\"default\\",\\"async\\":true}\\nM6:{\\"id\\":\\"8500\\",\\"name\\":\\"\\",\\"chunks\\":[\\"272:webpa"])</script><script>self.__next_f.push([1,"ck-77626c319c0ba323\\",\\"166:166-2312eb4d29d1600f\\",\\"744:main-app-8b742df4654db42b\\"],\\"async\\":false}\\nM7:{\\"id\\":\\"5192\\",\\"name\\":\\"\\",\\"chunks\\":[\\"272:webpack-77626c319c0ba323\\",\\"166:166-2312eb4d29d1600f\\",\\"744:main-app-8b742df4654db42b\\"],\\"async\\":false}\\nM8:{\\"id\\":\\"1440\\",\\"chunks\\":[\\"292:2920303b-7f3358b99f0055a1\\",\\"769:769-2db59afba13d4a14\\",\\"931:app/page-2990bbe807560c81\\"],\\"name\\":\\"default\\",\\"async\\":true}\\n"])</script><script>self.__next_f.push([1,"J1:[\\"$\\",\\"@2\\",null,{\\"assetPrefix\\":\\"\\",\\"initialCanonicalUrl\\":\\"/\\",\\"initialTree\\":[\\"\\",{\\"children\\":[\\"\\",{}]},null,null,true],\\"initialHead\\":[\\"@3\\",null],\\"globalErrorComponent\\":\\"$4\\",\\"children\\":[null,null,[[\\"$\\",\\"link\\",\\"0\\",{\\"rel\\":\\"stylesheet\\",\\"href\\":\\"/_next/static/css/820a62dc2f01c73c.css\\",\\"precedence\\":\\"high\\"}]],[\\"$\\",\\"@5\\",null,{\\"children\\":[\\"$\\",\\"@6\\",null,{\\"parallelRouterKey\\":\\"children\\",\\"segmentPath\\":[\\"children\\"],\\"hasLoading\\":false,\\"template\\":[\\"$\\",\\"@7\\",null,{}],\\"notFound\\":[\\"$\\",\\"div\\",null,{\\"style\\":{\\"fontFamily\\":\\"-apple-system, BlinkMacSystemFont, Roboto, \\\\\\"Segoe UI\\\\\\", \\\\\\"Fira Sans\\\\\\", Avenir, \\\\\\"Helvetica Neue\\\\\\", \\\\\\"Lucida Grande\\\\\\", sans-serif\\",\\"height\\":\\"100vh\\",\\"textAlign\\":\\"center\\",\\"display\\":\\"flex\\",\\"flexDirection\\":\\"column\\",\\"alignItems\\":\\"center\\",\\"justifyContent\\":\\"center\\"},\\"children\\":[[\\"$\\",\\"head\\",null,{\\"children\\":[\\"$\\",\\"title\\",null,{\\"children\\":\\"404: This page could not be found.\\"}]}],[\\"$\\",\\"div\\",null,{\\"children\\":[[\\"$\\",\\"style\\",null,{\\"dangerouslySetInnerHTML\\":{\\"__html\\":\\"\\\\n            body { margin: 0; color: #000; background: #fff; }\\\\n            .next-error-h1 {\\\\n              border-right: 1px solid rgba(0, 0, 0, .3);\\\\n            }\\\\n\\\\n            @media (prefers-color-scheme: dark) {\\\\n              body { color: #fff; background: #000; }\\\\n              .next-error-h1 {\\\\n                border-right: 1px solid rgba(255, 255, 255, .3);\\\\n              }\\\\n            }\\\\n          \\"}}],[\\"$\\",\\"h1\\",null,{\\"className\\":\\"next-error-h1\\",\\"style\\":{\\"display\\":\\"inline-block\\",\\"margin\\":0,\\"marginRight\\":\\"20px\\",\\"padding\\":\\"0 23px 0 0\\",\\"fontSize\\":\\"24px\\",\\"fontWeight\\":500,\\"verticalAlign\\":\\"top\\",\\"lineHeight\\":\\"49px\\"},\\"children\\":\\"404\\"}],[\\"$\\",\\"div\\",null,{\\"style\\":{\\"display\\":\\"inline-block\\",\\"textAlign\\":\\"left\\",\\"lineHeight\\":\\"49px\\",\\"height\\":\\"49px\\",\\"verticalAlign\\":\\"middle\\"},\\"children\\":[\\"$\\",\\"h2\\",null,{\\"style\\":{\\"fontSize\\":\\"14px\\",\\"fontWeight\\":\\"normal\\",\\"lineHeight\\":\\"49px\\",\\"margin\\":0,\\"padding\\":0},\\"children\\":\\"This page could not be found.\\"}]}]]}]]}],\\"childProp\\":{\\"current\\":[null,null,[],[\\"$\\",\\"@8\\",null,{\\"params\\":{},\\"searchParams\\":{}}]],\\"segment\\":\\"\\"}}],\\"params\\":{}}]]}]\\n"])</script><script>self.__next_f.push([1,"J3:[[[\\"$\\",\\"meta\\",null,{\\"charSet\\":\\"utf-8\\"}],null,null,null,null,null,null,null,null,null,[\\"$\\",\\"meta\\",null,{\\"name\\":\\"viewport\\",\\"content\\":\\"width=device-width, initial-scale=1\\"}],null,null,null,null,null,null,null,null,null,null,[]],[null,[],null,null],null,null,null,null,null,null,null]\\n"])</script></body></html>',
        css: '/*\n! tailwindcss v3.3.0 | MIT License | https://tailwindcss.com\n*/*,:after,:before{box-sizing:border-box;border:0 solid #e5e7eb}:after,:before{--tw-content:""}html{line-height:1.5;-webkit-text-size-adjust:100%;-moz-tab-size:4;-o-tab-size:4;tab-size:4;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;font-feature-settings:normal;font-variation-settings:normal}body{margin:0;line-height:inherit}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,pre,samp{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;font-size:1em}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}button,input,optgroup,select,textarea{font-family:inherit;font-size:100%;font-weight:inherit;line-height:inherit;color:inherit;margin:0;padding:0}button,select{text-transform:none}[type=button],[type=reset],[type=submit],button{-webkit-appearance:button;background-color:transparent;background-image:none}:-moz-focusring{outline:auto}:-moz-ui-invalid{box-shadow:none}progress{vertical-align:baseline}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dd,dl,figure,h1,h2,h3,h4,h5,h6,hr,p,pre{margin:0}fieldset{margin:0}fieldset,legend{padding:0}menu,ol,ul{list-style:none;margin:0;padding:0}textarea{resize:vertical}input::-moz-placeholder,textarea::-moz-placeholder{opacity:1;color:#9ca3af}input::placeholder,textarea::placeholder{opacity:1;color:#9ca3af}[role=button],button{cursor:pointer}:disabled{cursor:default}audio,canvas,embed,iframe,img,object,svg,video{display:block;vertical-align:middle}img,video{max-width:100%;height:auto}[hidden]{display:none}*,:after,:before{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: }::backdrop{--tw-border-spacing-x:0;--tw-border-spacing-y:0;--tw-translate-x:0;--tw-translate-y:0;--tw-rotate:0;--tw-skew-x:0;--tw-skew-y:0;--tw-scale-x:1;--tw-scale-y:1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness:proximity;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-color:rgba(59,130,246,.5);--tw-ring-offset-shadow:0 0 #0000;--tw-ring-shadow:0 0 #0000;--tw-shadow:0 0 #0000;--tw-shadow-colored:0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: }.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}.visible{visibility:visible}.invisible{visibility:hidden}.fixed{position:fixed}.absolute{position:absolute}.bottom-0{bottom:0}.left-0{left:0}.right-0{right:0}.top-0{top:0}.top-20{top:5rem}.z-10{z-index:10}.z-40{z-index:40}.z-50{z-index:50}.m-2{margin:.5rem}.m-3{margin:.75rem}.-mx-1{margin-left:-.25rem;margin-right:-.25rem}.-mx-1\\.5{margin-left:-.375rem;margin-right:-.375rem}.-my-1{margin-top:-.25rem;margin-bottom:-.25rem}.-my-1\\.5{margin-top:-.375rem;margin-bottom:-.375rem}.mx-10{margin-left:2.5rem;margin-right:2.5rem}.mx-2{margin-left:.5rem;margin-right:.5rem}.mx-24{margin-left:6rem;margin-right:6rem}.mx-auto{margin-left:auto;margin-right:auto}.my-1{margin-top:.25rem;margin-bottom:.25rem}.-mt-8{margin-top:-2rem}.mb-1{margin-bottom:.25rem}.mb-3{margin-bottom:.75rem}.mb-8{margin-bottom:2rem}.ml-0{margin-left:0}.ml-2{margin-left:.5rem}.ml-3{margin-left:.75rem}.ml-auto{margin-left:auto}.mr-2{margin-right:.5rem}.mt-10{margin-top:2.5rem}.mt-2{margin-top:.5rem}.mt-4{margin-top:1rem}.mt-6{margin-top:1.5rem}.mt-8{margin-top:2rem}.block{display:block}.flex{display:flex}.inline-flex{display:inline-flex}.grid{display:grid}.hidden{display:none}.h-0{height:0}.h-0\\.5{height:.125rem}.h-10{height:2.5rem}.h-16{height:4rem}.h-20{height:5rem}.h-28{height:7rem}.h-4{height:1rem}.h-40{height:10rem}.h-48{height:12rem}.h-5{height:1.25rem}.h-6{height:1.5rem}.h-80{height:20rem}.h-96{height:24rem}.h-\\[180px\\]{height:180px}.h-\\[250px\\]{height:250px}.h-full{height:100%}.h-screen{height:100vh}.min-h-screen{min-height:100vh}.w-1/2{width:50%}.w-1/3{width:33.333333%}.w-2/3{width:66.666667%}.w-4{width:1rem}.w-40{width:10rem}.w-44{width:11rem}.w-5{width:1.25rem}.w-6{width:1.5rem}.w-64{width:16rem}.w-\\[28rem\\]{width:28rem}.w-full{width:100%}.w-screen{width:100vw}.max-w-2xl{max-width:42rem}.max-w-3xl{max-width:48rem}.max-w-\\[670px\\]{max-width:670px}.max-w-xl{max-width:36rem}.flex-1{flex:1 1 0%}.flex-shrink-0{flex-shrink:0}.flex-grow{flex-grow:1}.-translate-x-full{--tw-translate-x:-100%}.-translate-x-full,.scale-75{transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.scale-75{--tw-scale-x:.75;--tw-scale-y:.75}.transform{transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}@keyframes spin{to{transform:rotate(1turn)}}.animate-spin{animation:spin 1s linear infinite}.cursor-pointer{cursor:pointer}.resize-none{resize:none}.resize-y{resize:vertical}.list-outside{list-style-position:outside}.grid-cols-4{grid-template-columns:repeat(4,minmax(0,1fr))}.grid-cols-flow{grid-template-columns:repeat(auto-fill,minmax(25rem,2fr))}.flex-row{flex-direction:row}.flex-col{flex-direction:column}.place-items-center{place-items:center}.items-start{align-items:flex-start}.items-end{align-items:flex-end}.items-center{align-items:center}.justify-end{justify-content:flex-end}.justify-center{justify-content:center}.justify-between{justify-content:space-between}.justify-around{justify-content:space-around}.gap-2{gap:.5rem}.gap-4{gap:1rem}.-space-x-px>:not([hidden])~:not([hidden]){--tw-space-x-reverse:0;margin-right:calc(-1px * var(--tw-space-x-reverse));margin-left:calc(-1px * calc(1 - var(--tw-space-x-reverse)))}.space-x-1>:not([hidden])~:not([hidden]){--tw-space-x-reverse:0;margin-right:calc(.25rem * var(--tw-space-x-reverse));margin-left:calc(.25rem * calc(1 - var(--tw-space-x-reverse)))}.space-x-2>:not([hidden])~:not([hidden]){--tw-space-x-reverse:0;margin-right:calc(.5rem * var(--tw-space-x-reverse));margin-left:calc(.5rem * calc(1 - var(--tw-space-x-reverse)))}.space-x-4>:not([hidden])~:not([hidden]){--tw-space-x-reverse:0;margin-right:calc(1rem * var(--tw-space-x-reverse));margin-left:calc(1rem * calc(1 - var(--tw-space-x-reverse)))}.space-y-2>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(.5rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(.5rem * var(--tw-space-y-reverse))}.space-y-6>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(1.5rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(1.5rem * var(--tw-space-y-reverse))}.space-y-8>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(2rem * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(2rem * var(--tw-space-y-reverse))}.divide-y>:not([hidden])~:not([hidden]){--tw-divide-y-reverse:0;border-top-width:calc(1px * calc(1 - var(--tw-divide-y-reverse)));border-bottom-width:calc(1px * var(--tw-divide-y-reverse))}.divide-gray-100>:not([hidden])~:not([hidden]){--tw-divide-opacity:1;border-color:rgb(243 244 246/var(--tw-divide-opacity))}.justify-self-center{justify-self:center}.overflow-hidden{overflow:hidden}.overflow-y-auto{overflow-y:auto}.whitespace-nowrap{white-space:nowrap}.rounded{border-radius:.25rem}.rounded-2xl{border-radius:1rem}.rounded-full{border-radius:9999px}.rounded-lg{border-radius:.5rem}.rounded-md{border-radius:.375rem}.rounded-xl{border-radius:.75rem}.rounded-l{border-top-left-radius:.25rem;border-bottom-left-radius:.25rem}.rounded-l-lg{border-top-left-radius:.5rem;border-bottom-left-radius:.5rem}.rounded-r-lg{border-top-right-radius:.5rem;border-bottom-right-radius:.5rem}.border{border-width:1px}.border-0{border-width:0}.border-gray-300{--tw-border-opacity:1;border-color:rgb(209 213 219/var(--tw-border-opacity))}.bg-black{--tw-bg-opacity:1;background-color:rgb(0 0 0/var(--tw-bg-opacity))}.bg-blue-100{--tw-bg-opacity:1;background-color:rgb(219 234 254/var(--tw-bg-opacity))}.bg-blue-300{--tw-bg-opacity:1;background-color:rgb(147 197 253/var(--tw-bg-opacity))}.bg-blue-50{--tw-bg-opacity:1;background-color:rgb(239 246 255/var(--tw-bg-opacity))}.bg-blue-700{--tw-bg-opacity:1;background-color:rgb(29 78 216/var(--tw-bg-opacity))}.bg-gray-200{--tw-bg-opacity:1;background-color:rgb(229 231 235/var(--tw-bg-opacity))}.bg-gray-300{--tw-bg-opacity:1;background-color:rgb(209 213 219/var(--tw-bg-opacity))}.bg-gray-50{--tw-bg-opacity:1;background-color:rgb(249 250 251/var(--tw-bg-opacity))}.bg-gray-500{--tw-bg-opacity:1;background-color:rgb(107 114 128/var(--tw-bg-opacity))}.bg-green-200{--tw-bg-opacity:1;background-color:rgb(187 247 208/var(--tw-bg-opacity))}.bg-neutral-200{--tw-bg-opacity:1;background-color:rgb(229 229 229/var(--tw-bg-opacity))}.bg-orange-100{--tw-bg-opacity:1;background-color:rgb(255 237 213/var(--tw-bg-opacity))}.bg-transparent{background-color:transparent}.bg-white{--tw-bg-opacity:1;background-color:rgb(255 255 255/var(--tw-bg-opacity))}.bg-gradient-to-b{background-image:linear-gradient(to bottom,var(--tw-gradient-stops))}.from-\\[\\#dbf4ff\\]{--tw-gradient-from:#dbf4ff var(--tw-gradient-from-position);--tw-gradient-from-position: ;--tw-gradient-to:rgba(219,244,255,0) var(--tw-gradient-from-position);--tw-gradient-to-position: ;--tw-gradient-stops:var(--tw-gradient-from),var(--tw-gradient-to)}.to-\\[\\#fff1f1\\]{--tw-gradient-to:#fff1f1 var(--tw-gradient-to-position);--tw-gradient-to-position: }.fill-black{fill:#000}.fill-blue-600{fill:#2563eb}.p-1{padding:.25rem}.p-10{padding:2.5rem}.p-2{padding:.5rem}.p-3{padding:.75rem}.p-4{padding:1rem}.p-5{padding:1.25rem}.px-1{padding-left:.25rem;padding-right:.25rem}.px-14{padding-left:3.5rem;padding-right:3.5rem}.px-2{padding-left:.5rem;padding-right:.5rem}.px-2\\.5{padding-left:.625rem;padding-right:.625rem}.px-28{padding-left:7rem;padding-right:7rem}.px-3{padding-left:.75rem;padding-right:.75rem}.px-4{padding-left:1rem;padding-right:1rem}.px-6{padding-left:1.5rem;padding-right:1.5rem}.py-0{padding-top:0;padding-bottom:0}.py-0\\.5{padding-top:.125rem;padding-bottom:.125rem}.py-2{padding-top:.5rem;padding-bottom:.5rem}.py-2\\.5{padding-top:.625rem;padding-bottom:.625rem}.py-3{padding-top:.75rem;padding-bottom:.75rem}.py-4{padding-top:1rem;padding-bottom:1rem}.py-6{padding-top:1.5rem;padding-bottom:1.5rem}.py-7{padding-top:1.75rem;padding-bottom:1.75rem}.pb-10{padding-bottom:2.5rem}.pb-3{padding-bottom:.75rem}.pl-2{padding-left:.5rem}.pl-32{padding-left:8rem}.pr-2{padding-right:.5rem}.pt-2{padding-top:.5rem}.pt-20{padding-top:5rem}.pt-32{padding-top:8rem}.text-center{text-align:center}.text-2xl{font-size:1.5rem;line-height:2rem}.text-3xl{font-size:1.875rem;line-height:2.25rem}.text-4xl{font-size:2.25rem;line-height:2.5rem}.text-sm{font-size:.875rem;line-height:1.25rem}.text-xl{font-size:1.25rem;line-height:1.75rem}.font-bold{font-weight:700}.font-medium{font-weight:500}.font-normal{font-weight:400}.font-semibold{font-weight:600}.leading-tight{line-height:1.25}.tracking-normal{letter-spacing:0}.text-black{--tw-text-opacity:1;color:rgb(0 0 0/var(--tw-text-opacity))}.text-blue-500{--tw-text-opacity:1;color:rgb(59 130 246/var(--tw-text-opacity))}.text-blue-600{--tw-text-opacity:1;color:rgb(37 99 235/var(--tw-text-opacity))}.text-blue-800{--tw-text-opacity:1;color:rgb(30 64 175/var(--tw-text-opacity))}.text-blue-900{--tw-text-opacity:1;color:rgb(30 58 138/var(--tw-text-opacity))}.text-gray-200{--tw-text-opacity:1;color:rgb(229 231 235/var(--tw-text-opacity))}.text-gray-500{--tw-text-opacity:1;color:rgb(107 114 128/var(--tw-text-opacity))}.text-gray-700{--tw-text-opacity:1;color:rgb(55 65 81/var(--tw-text-opacity))}.text-gray-800{--tw-text-opacity:1;color:rgb(31 41 55/var(--tw-text-opacity))}.text-gray-900{--tw-text-opacity:1;color:rgb(17 24 39/var(--tw-text-opacity))}.text-inherit{color:inherit}.text-neutral-500{--tw-text-opacity:1;color:rgb(115 115 115/var(--tw-text-opacity))}.text-orange-800{--tw-text-opacity:1;color:rgb(154 52 18/var(--tw-text-opacity))}.text-white{--tw-text-opacity:1;color:rgb(255 255 255/var(--tw-text-opacity))}.underline{text-decoration-line:underline}.shadow{--tw-shadow:0 1px 3px 0 rgba(0,0,0,.1),0 1px 2px -1px rgba(0,0,0,.1);--tw-shadow-colored:0 1px 3px 0 var(--tw-shadow-color),0 1px 2px -1px var(--tw-shadow-color)}.shadow,.shadow-2xl{box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-2xl{--tw-shadow:0 25px 50px -12px rgba(0,0,0,.25);--tw-shadow-colored:0 25px 50px -12px var(--tw-shadow-color)}.shadow-md{--tw-shadow:0 4px 6px -1px rgba(0,0,0,.1),0 2px 4px -2px rgba(0,0,0,.1);--tw-shadow-colored:0 4px 6px -1px var(--tw-shadow-color),0 2px 4px -2px var(--tw-shadow-color)}.shadow-md,.shadow-sm{box-shadow:var(--tw-ring-offset-shadow,0 0 #0000),var(--tw-ring-shadow,0 0 #0000),var(--tw-shadow)}.shadow-sm{--tw-shadow:0 1px 2px 0 rgba(0,0,0,.05);--tw-shadow-colored:0 1px 2px 0 var(--tw-shadow-color)}.backdrop-blur{--tw-backdrop-blur:blur(8px)}.backdrop-blur,.backdrop-brightness-75{-webkit-backdrop-filter:var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia);backdrop-filter:var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia)}.backdrop-brightness-75{--tw-backdrop-brightness:brightness(.75)}.transition{transition-property:color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,-webkit-backdrop-filter;transition-property:color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter;transition-property:color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter,-webkit-backdrop-filter;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.transition-transform{transition-property:transform;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.duration-75{transition-duration:75ms}.hover\\:-translate-y-1:hover{--tw-translate-y:-0.25rem;transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.hover\\:bg-blue-100:hover{--tw-bg-opacity:1;background-color:rgb(219 234 254/var(--tw-bg-opacity))}.hover\\:bg-blue-200:hover{--tw-bg-opacity:1;background-color:rgb(191 219 254/var(--tw-bg-opacity))}.hover\\:bg-blue-800:hover{--tw-bg-opacity:1;background-color:rgb(30 64 175/var(--tw-bg-opacity))}.hover\\:bg-gray-100:hover{--tw-bg-opacity:1;background-color:rgb(243 244 246/var(--tw-bg-opacity))}.hover\\:bg-gray-900:hover{--tw-bg-opacity:1;background-color:rgb(17 24 39/var(--tw-bg-opacity))}.hover\\:text-blue-700:hover{--tw-text-opacity:1;color:rgb(29 78 216/var(--tw-text-opacity))}.hover\\:text-blue-900:hover{--tw-text-opacity:1;color:rgb(30 58 138/var(--tw-text-opacity))}.hover\\:text-gray-700:hover{--tw-text-opacity:1;color:rgb(55 65 81/var(--tw-text-opacity))}.hover\\:underline:hover{text-decoration-line:underline}.focus\\:outline-none:focus{outline:2px solid transparent;outline-offset:2px}.focus\\:ring-2:focus{--tw-ring-offset-shadow:var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow:var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow,0 0 #0000)}.focus\\:ring-blue-400:focus{--tw-ring-opacity:1;--tw-ring-color:rgb(96 165 250/var(--tw-ring-opacity))}.focus\\:ring-gray-200:focus{--tw-ring-opacity:1;--tw-ring-color:rgb(229 231 235/var(--tw-ring-opacity))}.group:hover .group-hover\\:text-gray-900{--tw-text-opacity:1;color:rgb(17 24 39/var(--tw-text-opacity))}@media (prefers-color-scheme:dark){.dark\\:bg-blue-600{--tw-bg-opacity:1;background-color:rgb(37 99 235/var(--tw-bg-opacity))}.dark\\:bg-blue-900{--tw-bg-opacity:1;background-color:rgb(30 58 138/var(--tw-bg-opacity))}.dark\\:bg-gray-700{--tw-bg-opacity:1;background-color:rgb(55 65 81/var(--tw-bg-opacity))}.dark\\:bg-gray-800{--tw-bg-opacity:1;background-color:rgb(31 41 55/var(--tw-bg-opacity))}.dark\\:bg-orange-200{--tw-bg-opacity:1;background-color:rgb(254 215 170/var(--tw-bg-opacity))}.dark\\:text-blue-400{--tw-text-opacity:1;color:rgb(96 165 250/var(--tw-text-opacity))}.dark\\:text-gray-200{--tw-text-opacity:1;color:rgb(229 231 235/var(--tw-text-opacity))}.dark\\:text-gray-300{--tw-text-opacity:1;color:rgb(209 213 219/var(--tw-text-opacity))}.dark\\:text-gray-400{--tw-text-opacity:1;color:rgb(156 163 175/var(--tw-text-opacity))}.dark\\:text-gray-600{--tw-text-opacity:1;color:rgb(75 85 99/var(--tw-text-opacity))}.dark\\:text-neutral-400{--tw-text-opacity:1;color:rgb(163 163 163/var(--tw-text-opacity))}.dark\\:text-orange-900{--tw-text-opacity:1;color:rgb(124 45 18/var(--tw-text-opacity))}.dark\\:text-white{--tw-text-opacity:1;color:rgb(255 255 255/var(--tw-text-opacity))}.dark\\:backdrop-blur{--tw-backdrop-blur:blur(8px);-webkit-backdrop-filter:var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia);backdrop-filter:var(--tw-backdrop-blur) var(--tw-backdrop-brightness) var(--tw-backdrop-contrast) var(--tw-backdrop-grayscale) var(--tw-backdrop-hue-rotate) var(--tw-backdrop-invert) var(--tw-backdrop-opacity) var(--tw-backdrop-saturate) var(--tw-backdrop-sepia)}.dark\\:hover\\:bg-blue-700:hover{--tw-bg-opacity:1;background-color:rgb(29 78 216/var(--tw-bg-opacity))}.dark\\:hover\\:bg-blue-800:hover{--tw-bg-opacity:1;background-color:rgb(30 64 175/var(--tw-bg-opacity))}.dark\\:hover\\:bg-gray-600:hover{--tw-bg-opacity:1;background-color:rgb(75 85 99/var(--tw-bg-opacity))}.dark\\:hover\\:bg-gray-700:hover{--tw-bg-opacity:1;background-color:rgb(55 65 81/var(--tw-bg-opacity))}.dark\\:hover\\:text-blue-300:hover{--tw-text-opacity:1;color:rgb(147 197 253/var(--tw-text-opacity))}.dark\\:hover\\:text-white:hover{--tw-text-opacity:1;color:rgb(255 255 255/var(--tw-text-opacity))}.dark\\:focus\\:ring-blue-800:focus{--tw-ring-opacity:1;--tw-ring-color:rgb(30 64 175/var(--tw-ring-opacity))}.dark\\:focus\\:ring-gray-600:focus{--tw-ring-opacity:1;--tw-ring-color:rgb(75 85 99/var(--tw-ring-opacity))}.group:hover .dark\\:group-hover\\:text-white{--tw-text-opacity:1;color:rgb(255 255 255/var(--tw-text-opacity))}}@media (min-width:640px){.sm\\:mb-0{margin-bottom:0}.sm\\:ml-64{margin-left:16rem}.sm\\:translate-x-0{--tw-translate-x:0px;transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skewX(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.sm\\:px-20{padding-left:5rem;padding-right:5rem}.sm\\:px-6{padding-left:1.5rem;padding-right:1.5rem}}@media (min-width:768px){.md\\:visible{visibility:visible}.md\\:mt-0{margin-top:0}.md\\:block{display:block}.md\\:flex{display:flex}.md\\:hidden{display:none}.md\\:max-w-5xl{max-width:64rem}.md\\:flex-row{flex-direction:row}.md\\:items-center{align-items:center}.md\\:justify-between{justify-content:space-between}.md\\:space-x-6>:not([hidden])~:not([hidden]){--tw-space-x-reverse:0;margin-right:calc(1.5rem * var(--tw-space-x-reverse));margin-left:calc(1.5rem * calc(1 - var(--tw-space-x-reverse)))}.md\\:space-y-0>:not([hidden])~:not([hidden]){--tw-space-y-reverse:0;margin-top:calc(0px * calc(1 - var(--tw-space-y-reverse)));margin-bottom:calc(0px * var(--tw-space-y-reverse))}.md\\:px-2{padding-left:.5rem;padding-right:.5rem}.md\\:px-56{padding-left:14rem;padding-right:14rem}.md\\:py-1{padding-top:.25rem;padding-bottom:.25rem}.md\\:py-3{padding-top:.75rem;padding-bottom:.75rem}.md\\:pb-0{padding-bottom:0}.md\\:pt-20{padding-top:5rem}}@media (min-width:1024px){.lg\\:inline-block{display:inline-block}.lg\\:pt-20{padding-top:5rem}}',
      },
    },
  };
  res.send(resp);
});

app.post("/scraper", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }
  try {
    const scraped = await scrapev2(url);
    res.status(200).json({ scraped });
  } catch (err) {
    console.error(`Error scraping website: ${url}`, err);
    return res.status(500).json({ error: err.message });
  }
});

const scrapev2 = async (url) => {
  try {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);

    const result = {
      design: {},
    };

    // Extract design and template information
    result.design.html = await page.content();
    result.design.css = await extractCSS(page);

    // Save extracted assets to disk
    await browser.close();

    return result;
  } catch (err) {
    console.error(`Error scraping website: ${url}`, err);
    throw err;
  }
};
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
    await saveAssets(url, result.design);

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
const saveAssets = async (url, design) => {
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
  } catch (err) {
    console.error("Error saving assets", err);
    throw err;
  }
};

const generateTemplate = (design) => {
  // Will Implement template generation logic here
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
