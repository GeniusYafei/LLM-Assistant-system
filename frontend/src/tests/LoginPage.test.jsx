import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../pages/auth/LoginPage.jsx";

describe("LoginPage", () => {
  let onLogin;

  beforeEach(() => {
    onLogin = vi.fn();
  });

  const renderLogin = () =>
    render(
      <MemoryRouter>
        <LoginPage onLogin={onLogin} />
      </MemoryRouter>
    );

  it("renders email & password input fields", () => {
    renderLogin();

    // email placeholder is: you@example.com
    expect(screen.getByPlaceholderText("you@example.com")).toBeInTheDocument();

    // password label is: Password
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
  });

  it("allows typing email and password", () => {
    renderLogin();

    const emailInput = screen.getByPlaceholderText("you@example.com");
    const passwordInput = screen.getByLabelText("Password");

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "123456" } });

    expect(emailInput.value).toBe("test@example.com");
    expect(passwordInput.value).toBe("123456");
  });

  it("Sign in button is always enabled (since UI does not disable)", () => {
    renderLogin();
    const submitBtn = screen.getByRole("button", { name: /sign in/i });

    // The existing UI never disables this button → expect enabled
    expect(submitBtn).not.toBeDisabled();
  });

  it("calls onLogin when clicking Sign in button", () => {
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "abc@xyz.com" },
    });

    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "123456" },
    });

    const submitBtn = screen.getByRole("button", { name: /sign in/i });
    fireEvent.click(submitBtn);

    expect(onLogin).toHaveBeenCalledWith("abc@xyz.com", "123456");
  });

  it("renders Forgot password? button", () => {
    renderLogin();

    // only check existence, not click behavior
    const forgotBtn = screen.getByRole("button", { name: /forgot password/i });
    expect(forgotBtn).toBeInTheDocument();
  });

  it("renders Sign up text", () => {
    renderLogin();

    // only check existence, not click behavior
    expect(screen.getByText(/sign up/i)).toBeInTheDocument();
  });
});
