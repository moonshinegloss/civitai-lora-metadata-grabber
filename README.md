# civitai-lora-metadata-grabber

[![install](https://user-images.githubusercontent.com/118488816/202579095-03336ed4-80ae-4066-b764-3636772a4fb6.png)](https://raw.githubusercontent.com/moonshinegloss/civitai-lora-metadata-grabber/main/civitai-lora-metadata.user.js)

tampermonkey script; shows the metadata of any civitai uploaded lora.
it will replace the play button on the model pages like so:

![image](https://github.com/moonshinegloss/civitai-lora-metadata-grabber/assets/118488816/e43edd6d-d066-4a28-a0a3-5ceb70facb7f)

clicking "JSON", will do either of two things:
- show a messagebox with the relevant metadata and nothing else
- download the metadata as a json file

you can control that behavior with the settings at the top:

```js
const onlyShowRelevantKeys = true;
const downloadMetaData = false;
```

`onlyShowRelevantKeys` - filters the metadata only to a few select keys that are interesting, set it to false to get everything
`downloadMetaData` - will download a json file instead of just popping up a messagebox in your browser
