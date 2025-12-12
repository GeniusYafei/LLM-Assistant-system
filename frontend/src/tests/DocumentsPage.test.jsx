
import React from "react";
import { render, screen } from "@testing-library/react";

vi.mock("../components/documents/DocumentUpload.jsx", () => ({
  DocumentUpload: ({
    documents,
    onUpload,
    onDelete,
    loading,
    quotaBytes,
    remainingBytes,
    disabled,
  }) => (
    <div data-testid="mock-upload">
      <span data-testid="mock-upload-doc-count">{documents.length}</span>
      <span data-testid="mock-upload-loading">{String(loading)}</span>
      <span data-testid="mock-upload-quota">{String(quotaBytes)}</span>
      <span data-testid="mock-upload-remaining">{String(remainingBytes)}</span>
      <span data-testid="mock-upload-disabled">{String(disabled)}</span>
    </div>
  ),
}));

import { DocumentsPage } from "../pages/documents/DocumentsPage.jsx";

describe("DocumentsPage Component", () => {
  const mockDocs = [
    { id: "1", name: "A.pdf", size: 1024 * 1024 }, // 1 MB
    { id: "2", name: "B.txt", size: 512 * 1024 },  // 0.5 MB
  ];

  test("renders page header text correctly", () => {
    render(
      <DocumentsPage
        documents={mockDocs}
        onUpload={() => {}}
        onDelete={() => {}}
        uploadLoading={false}
        storageUsed={1536 * 1024}
        storageQuota={10 * 1024 * 1024}
      />
    );

    expect(screen.getByText("Document Manager")).toBeInTheDocument();
    expect(
      screen.getByText("Upload and manage documents for your conversations")
    ).toBeInTheDocument();
  });

  test("renders document count correctly", () => {
    render(
      <DocumentsPage
        documents={mockDocs}
        onUpload={() => {}}
        onDelete={() => {}}
        uploadLoading={false}
        storageUsed={0}
        storageQuota={null}
      />
    );

    const documentsLabel = screen.getByText("Documents");
    const container = documentsLabel.closest("div");
    expect(container).toHaveTextContent("2");
  });

  test("calculates and displays total file size in MB", () => {
    render(
      <DocumentsPage
        documents={mockDocs}
        onUpload={() => {}}
        onDelete={() => {}}
        uploadLoading={false}
        storageUsed={0}
        storageQuota={null}
      />
    );

    // 1.00 MB + 0.50 MB = 1.50 MB
    expect(screen.getByText("1.5 MB")).toBeInTheDocument();
  });

  test("passes correct props → DocumentUpload (mock)", () => {
    render(
      <DocumentsPage
        documents={mockDocs}
        onUpload={() => {}}
        onDelete={() => {}}
        uploadLoading={true}
        storageUsed={3 * 1024 * 1024}
        storageQuota={5 * 1024 * 1024}
      />
    );

    // mockUpload should receive correct values
    expect(screen.getByTestId("mock-upload-doc-count").textContent).toBe("2");
    expect(screen.getByTestId("mock-upload-loading").textContent).toBe("true");

    // quotaBytes
    expect(screen.getByTestId("mock-upload-quota").textContent).toBe(
      String(5 * 1024 * 1024)
    );

    // remainingBytes = quotaBytes - used
    expect(screen.getByTestId("mock-upload-remaining").textContent).toBe(
      String(2 * 1024 * 1024)
    );
  });

  test("disables upload when remaining storage = 0", () => {
    render(
      <DocumentsPage
        documents={mockDocs}
        onUpload={() => {}}
        onDelete={() => {}}
        uploadLoading={false}
        storageUsed={10 * 1024 * 1024}
        storageQuota={10 * 1024 * 1024}
      />
    );

    expect(screen.getByTestId("mock-upload-disabled").textContent).toBe("true");
  });
});
