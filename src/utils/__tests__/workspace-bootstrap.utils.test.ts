import { describe, expect, it } from "vitest";
import {
  resolveWorkspaceBootstrap,
  shouldReplaceSelectedWorkspace,
} from "@/utils/workspace-bootstrap.utils";
import type { Workspace } from "@/types/workspace.types";

const active: Workspace = {
  id: "ws-1",
  name: "Clinic",
  organizationId: "org-1",
  organizationName: "Org",
  status: "active",
};

const other: Workspace = {
  id: "ws-2",
  name: "Other",
  organizationId: "org-2",
  organizationName: "Org 2",
  status: "active",
};

describe("resolveWorkspaceBootstrap", () => {
  it("clears when no active workspaces", () => {
    expect(resolveWorkspaceBootstrap([], active)).toEqual({
      action: "clear",
      hasAccess: false,
    });
  });

  it("selects default when current workspace is inaccessible", () => {
    expect(resolveWorkspaceBootstrap([active, other], null)).toEqual({
      action: "select",
      workspace: active,
      hasAccess: true,
    });
  });

  it("no-ops when current workspace is accessible", () => {
    expect(resolveWorkspaceBootstrap([active, other], active)).toEqual({
      action: "none",
    });
  });
});

describe("shouldReplaceSelectedWorkspace", () => {
  it("replaces when missing current", () => {
    expect(shouldReplaceSelectedWorkspace(null, active)).toBe(true);
  });

  it("skips replace when id matches", () => {
    expect(shouldReplaceSelectedWorkspace(active, { ...active, name: "Renamed" })).toBe(
      false,
    );
  });
});
