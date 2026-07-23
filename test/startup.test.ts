import { assert } from "chai";
import { buildPdfTaskFormData, resolveRuntimeGlobal } from "../src/services/apiClient";

describe("FanyiPaiban plugin startup", function () {
  it("initializes the plugin instance", function () {
    const instance = (Zotero as unknown as Record<string, any>).FanyiPaiban;
    assert.isOk(instance);
    assert.isTrue(instance.data.initialized);
    assert.isOk(instance.services.credentials);
    assert.isOk(instance.services.translation);
  });

  it("resolves the multipart upload APIs in the Zotero runtime", function () {
    const RuntimeFile = resolveRuntimeGlobal<typeof File>("File");
    const RuntimeFormData = resolveRuntimeGlobal<typeof FormData>("FormData");
    const RuntimeXMLHttpRequest = resolveRuntimeGlobal<typeof XMLHttpRequest>("XMLHttpRequest");

    assert.isFunction(RuntimeFile.createFromFileName);
    assert.isOk(new RuntimeFormData());
    assert.isFunction(RuntimeXMLHttpRequest);
  });

  it("builds a multipart PDF upload payload in the Zotero runtime", async function () {
    const tempFile = Zotero.getTempDirectory();
    tempFile.append(`fanyipaiban-upload-${Date.now()}.pdf`);

    try {
      await Zotero.File.putContentsAsync(tempFile, "%PDF-1.4\n%%EOF\n");
      const formData = await buildPdfTaskFormData({
        filePath: tempFile.path,
        fileName: "runtime-upload.pdf",
        targetLanguage: "zh-CN",
      });

      assert.equal((formData.get("file") as File).name, "runtime-upload.pdf");
      assert.equal(formData.get("source_lang"), "auto");
      assert.equal(formData.get("target_lang"), "zh-CN");
      assert.equal(formData.get("parse_engine"), "MINERU");
    } finally {
      await Zotero.File.removeIfExists(tempFile.path);
    }
  });
});
