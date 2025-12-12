import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage.jsx";
import { BrowserRouter } from "react-router-dom";

vi.mock("../hooks/useApi.jsx", () => {
  return {
    useApi: () => ({
      request: mockRequest,
      loading: false,
      error: null,
    }),
  };
});

const mockRequest = vi.fn();

const renderPage = () =>
  render(
    <BrowserRouter>
      <ForgotPasswordPage />
    </BrowserRouter>
  );

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    mockRequest.mockReset();
  });

  it("renders email & display name input fields and send code button", () => {
    renderPage();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send verification code/i })
    ).toBeInTheDocument();
  });

  it("allows typing into email & display name fields", () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "Bruce" },
    });

    expect(screen.getByLabelText(/email/i).value).toBe("test@example.com");
    expect(screen.getByLabelText(/display name/i).value).toBe("Bruce");
  });

  it("calls forgot password API and reveals Step 2", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "Bruce" },
    });

    mockRequest.mockResolvedValueOnce({ code: "123456" });

    fireEvent.click(
      screen.getByRole("button", { name: /send verification code/i })
    );

    await waitFor(() => {
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
  });

  it("updates password rule indicators when typing password", async () => {
    renderPage();

    // Step 2 must be enabled
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/display name/i), {
      target: { value: "Bruce" },
    });

    // Mock and send code
    mockRequest.mockResolvedValueOnce({ code: "123456" });
    fireEvent.click(
      screen.getByRole("button", { name: /send verification code/i })
    );

    await waitFor(() =>
      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument()
    );

    // Type password
    fireEvent.change(screen.getByLabelText(/new password/i), {
      target: { value: "Abc123!@" },
    });

    expect(screen.getByText(/at least 8 characters/i)).toHaveClass("text-green-600");
    expect(screen.getByText(/at least one number/i)).toHaveClass("text-green-600");
    expect(
      screen.getByText(/at least one uppercase and one lowercase/i)
    ).toHaveClass("text-green-600");
    expect(screen.getByText(/at least one special character/i)).toHaveClass(
      "text-green-600"
    );
  });
});
