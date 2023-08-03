// ==UserScript==
// @name         CivitAI metadata grabber
// @version      0.6
// @description  fetch metadata from civitai loras
// @author       moonshinegloss
// @match        https://*civitai.com/models/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=civitai.com
// @grant        GM.xmlHttpRequest
// @updateURL    https://raw.githubusercontent.com/moonshinegloss/civitai-lora-metadata-grabber/main/civitai-lora-metadata.user.js
// ==/UserScript==

// settings
const onlyShowRelevantKeys = true;
const downloadMetaData = false;

// Define svg path data for the icons to be used in the extension, one for JSON, one for processing one for error and one for success
const jsonIconPath = "M20 16v-8l3 8v-8 M15 8a2 2 0 0 1 2 2v4a2 2 0 1 1 -4 0v-4a2 2 0 0 1 2 -2z M1 8h3v6.5a1.5 1.5 0 0 1 -3 0v-.5 M7 15a1 1 0 0 0 1 1h1a1 1 0 0 0 1 -1v-2a1 1 0 0 0 -1 -1h-1a1 1 0 0 1 -1 -1v-2a1 1 0 0 1 1 -1h1a1 1 0 0 1 1 1";
const processingIconPath = "M12 6l0 -3 M16.25 7.75l2.15 -2.15 M18 12l3 0 M16.25 16.25l2.15 2.15 M12 18l0 3 M7.75 16.25l-2.15 2.15 M6 12l-3 0 M7.75 7.75l-2.15 -2.15";
const errorIconPath = "M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M12 9v4M12 16v.01";
const successIconPath = "M5 12l5 5l10 -10";

function replaceRunButton() {
    const runButton = document.querySelector(".tabler-icon.tabler-icon-player-play").closest("button");
    const icon = document.querySelector(".tabler-icon.tabler-icon-player-play>path");
    icon.setAttribute("d", jsonIconPath);
    runButton.style.backgroundColor = "#343a40";
    icon.parentElement.setAttribute("stroke", "white");
    runButton.addEventListener("mouseover", (event) => {
        const tooltip = runButton.previousSibling;
        if (tooltip.classList.contains("mantine-Tooltip-tooltip")) {
            tooltip.innerText = "Download Metadata";
        }
    });

    runButton.addEventListener("click", async (event) => {
        event.stopImmediatePropagation();
        icon.setAttribute("d", processingIconPath);
        runButton.style.backgroundColor = "#1971c2";
        const link = document.querySelector(`a[href^="/api/download/models/"]`);
        if (!link) {
            console.log('No download link found');
            icon.setAttribute("d", errorIconPath);
            runButton.style.backgroundColor = "#C92A2A";
            alert('No download link found');
            return;
        }

        const url = link.href;
        console.log(`Found download link: ${url}`);
        console.log('Attempting to download first 4 bytes...');

        const getRange = async (range,responseType="text") => {
          console.log(`Getting url ${url} with range: ${range}`);
          return await new Promise((resolve) => {
              GM.xmlHttpRequest({
                  method: "GET",
                  url,
                  redirect: "follow",
                  anonymous: true,
                  fetch: true,
                  headers: {
                      'Range': range,
                  },
                  responseType,
                  onload: (response) => {
                      resolve(response)
                  }
              });
          });
        }

        let response = await getRange('bytes=0-3','arraybuffer');
        if(response.status !== 206) {
            console.log(response);
            alert("cloudflare triggered, try again later");
            icon.setAttribute("d", errorIconPath);
            runButton.style.backgroundColor = "#C92A2A";
            return;
        }

        let filename = response.responseHeaders.match(/filename="(.+?)"/)[1];
        console.log(`Filename: ${filename}`);
        let data = await response.response;
        let seekAmount = new DataView(data).getUint32(0, true);
        console.log(`Seek amount: ${seekAmount}`);

        // Download the metadata
        console.log('Attempting to download metadata...');
        response = await getRange(`bytes=8-${seekAmount + 7}`);
        data = response.responseText;
        console.log(`Metadata downloaded: ${data}`);

        try {
            let parsedJson = JSON.parse(data);

            if(!parsedJson?.["__metadata__"] || !parsedJson?.["__metadata__"]?.ss_resolution) {
                alert("No metadata found, sorry!");
                icon.setAttribute("d", errorIconPath);
                runButton.style.backgroundColor = "#C92A2A";
                return;
            }

            if(onlyShowRelevantKeys) {
                const metadata = parsedJson["__metadata__"];
                const start_at = new Date(parseFloat(metadata.ss_training_started_at) * 1000);
                const end_at = new Date(parseFloat(metadata.ss_training_finished_at) * 1000);
                let runtime = Math.floor((end_at - start_at) / (1000 * 60));

                if (runtime < 60) {
                    runtime = `${runtime} minutes`;
                } else {
                    runtime = `${(runtime / 60).toFixed(2)} hours`;
                }

                parsedJson = {
                    runtime,
                    images: metadata.ss_num_train_images,
                    batch: metadata.ss_total_batch_size,
                    epochs: metadata.ss_num_epochs,
                    learning_rate: metadata.ss_learning_rate,
                    dim: metadata.ss_network_dim,
                    alpha: metadata.ss_network_alpha,
                    unet_lr: metadata.ss_unet_lr,
                    text_encoder_lr: metadata.ss_text_encoder_lr,
                    sdxl09: metadata.sshs_model_hash === "1f697312617db511045698dbf419ae1e2999427d4e4423a321b461cc180d1a97",
                    sdxl1: metadata.sshs_model_hash === "31e35c80fc4829d14f90153f4c74cd59c90b779f6afe05a74cd6120b893f7e5b",
                    network_args: metadata.ss_network_args,
                    scheduler: metadata.ss_lr_scheduler,
                    optimizer: metadata.ss_optimizer,
                    resolution: metadata.ss_resolution,
                    model_version: metadata.ss_base_model_version,
                    model_hash: metadata.sshs_model_hash,
                    model_new_hash: metadata.sshs_model_hash
                }
            }

            const prettified = JSON.stringify(parsedJson, null, 4);
            if(downloadMetaData) {
                const blob = new Blob([prettified], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename + '.json';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }else{
                alert(prettified);
            }
        } catch (error) {
            console.log(`ERROR: ${error}`);
            icon.setAttribute("d", errorIconPath);
            runButton.style.backgroundColor = "#C92A2A";
            alert("Error. Check console for details.");
            return;
        }
        icon.setAttribute("d", successIconPath);
        runButton.style.backgroundColor = "#2F9E44";
    });
}

// Replace the run button when the page loads
replaceRunButton();

// use a mutation observer to replace the run button when the page title changes
const titleObserver = new MutationObserver(replaceRunButton);
titleObserver.observe(document.querySelector('title'), { childList: true, subtree: true });
