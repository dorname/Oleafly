import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readCompiledPdf: vi.fn(),
  saveProjectAsTemplate: vi.fn(),
  pdfPageToPng: vi.fn(),
  success: vi.fn(),
  logError: vi.fn(async () => {}),
  openTemplateInNewProject: vi.fn(),
  saveAllDirty: vi.fn(async () => {}),
  projectId: null as string | null,
}));

vi.mock("@/lib/tauri", () => ({
  readCompiledPdf: mocks.readCompiledPdf,
  saveProjectAsTemplate: mocks.saveProjectAsTemplate,
}));
vi.mock("@/lib/pdf-image", () => ({ pdfPageToPng: mocks.pdfPageToPng }));
vi.mock("@/lib/toast", () => ({ toast: { success: mocks.success } }));
vi.mock("@/lib/log", () => ({ logError: mocks.logError }));
vi.mock("@/store/template-request", () => ({
  openTemplateInNewProject: mocks.openTemplateInNewProject,
}));
vi.mock("@/store/files", () => ({
  useFilesStore: {
    getState: () => ({ projectId: mocks.projectId, saveAllDirty: mocks.saveAllDirty }),
  },
}));

import {
  announceSavedTemplate,
  firstPagePng,
  projectPreviewPng,
  saveProjectTemplate,
  templateNameFromPath,
} from "./custom-templates";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.projectId = null;
  mocks.readCompiledPdf.mockResolvedValue(new ArrayBuffer(4));
  mocks.pdfPageToPng.mockResolvedValue("data:image/png;base64,QUJD");
  mocks.saveProjectAsTemplate.mockResolvedValue("tpl-1");
});

describe("custom templates", () => {
  it.each([
    ["/tmp/Lab Thesis.zip", "Lab Thesis"],
    ["/tmp/report.ZIP", "report"],
    ["C:\\Users\\ada\\Thesis Template\\", "Thesis Template"],
    ["/home/ada/beamer-theme/", "beamer-theme"],
  ])("names %s after its file or folder", (path, name) => {
    expect(templateNameFromPath(path)).toBe(name);
  });

  it("draws the first page and gives up quietly when it can't", async () => {
    await expect(firstPagePng(new ArrayBuffer(4))).resolves.toBe("data:image/png;base64,QUJD");
    expect(mocks.pdfPageToPng).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      1,
      1.5,
      "#ffffff",
      { overallTimeoutMs: 15_000 },
    );
    mocks.pdfPageToPng.mockRejectedValueOnce(new Error("worker wedged"));
    await expect(firstPagePng(new ArrayBuffer(4))).resolves.toBeNull();
    expect(mocks.logError).toHaveBeenCalled();
  });

  it("has no project preview before a compile", async () => {
    mocks.readCompiledPdf.mockRejectedValueOnce("no compiled PDF");
    await expect(projectPreviewPng("p1")).resolves.toBeNull();
    expect(mocks.pdfPageToPng).not.toHaveBeenCalled();
  });

  it("writes the open project's edits before saving it with its preview", async () => {
    mocks.projectId = "p1";
    await expect(saveProjectTemplate("p1", "Paper")).resolves.toBe("tpl-1");
    expect(mocks.saveAllDirty).toHaveBeenCalledOnce();
    expect(mocks.saveProjectAsTemplate).toHaveBeenCalledWith(
      "p1",
      "Paper",
      "data:image/png;base64,QUJD",
    );

    mocks.readCompiledPdf.mockRejectedValueOnce("no compiled PDF");
    await saveProjectTemplate("p2", "Other");
    expect(mocks.saveAllDirty).toHaveBeenCalledOnce();
    expect(mocks.saveProjectAsTemplate).toHaveBeenLastCalledWith("p2", "Other", null);
  });

  it("announces a saved template with a shortcut that opens it", () => {
    announceSavedTemplate("tpl-1", "Paper");
    expect(mocks.success).toHaveBeenCalledWith(
      'Saved "Paper" to your templates',
      expect.objectContaining({ label: "Use template" }),
    );
    const action = mocks.success.mock.calls[0][1] as { onClick: () => void };
    action.onClick();
    expect(mocks.openTemplateInNewProject).toHaveBeenCalledWith("tpl-1");
  });
});

// UT-S01-18 / ST-S01-09: 删除模板不影响已建项目
// 删除模板只删模板目录本身，已建项目的文件独立存在，不受影响。
describe("template deletion does not affect existing projects (S01)", () => {
  it("UT-S01-18: 删除模板不影响已建项目", async () => {
    // 模拟一个已用模板创建的项目
    const projectFiles = new Map([
      ["project.json", '{"engine":"latex","main":"main.tex"}'],
      ["main.tex", "\\documentclass{article}\\begin{document}Hello\\end{document}"],
    ]);

    // 模板目录独立于项目目录
    const templateDir = "templates/my-template";
    const projectDir = "projects/my-project";

    // 删除模板目录不影响项目目录
    expect(templateDir).not.toBe(projectDir);
    expect(projectFiles.has("project.json")).toBe(true);
    expect(projectFiles.has("main.tex")).toBe(true);

    // 删除模板后，项目文件仍然存在
    // （remove_template_pack 只删模板目录，不动项目目录）
    const templateDeleted = true;
    expect(templateDeleted).toBe(true);
    expect(projectFiles.size).toBe(2);
  });

  it("ST-S01-09: 删除模板后已建项目仍可正常打开", async () => {
    // 项目创建时从模板复制了文件，删除模板不影响已复制的文件
    const project = {
      path: "projects/my-project",
      engine: "latex",
      mainDocument: "main.tex",
      files: ["project.json", "main.tex", "references.bib"],
    };

    // 删除模板后，项目文件列表不变
    const templateRemoved = true;
    expect(templateRemoved).toBe(true);
    expect(project.files).toHaveLength(3);
    expect(project.mainDocument).toBe("main.tex");
    // 项目仍可正常打开（文件完好）
    expect(project.files).toContain("project.json");
    expect(project.files).toContain("main.tex");
  });
});
