import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../contexts/AuthContext.jsx";
import { SignupPage } from "../pages/auth/SignupPage.jsx";

vi.mock("../../hooks/useApi.jsx", () => ({
  useApi: () => ({
    fetchOrganizations: async () => [
      { id: "1", name: "UNSW" },
      { id: "2", name: "Sydney Health" },
    ],
  }),
}));

function renderWithProviders(ui) {
  return render(
    <AuthProvider>
      <BrowserRouter>{ui}</BrowserRouter>
    </AuthProvider>
  );
}

describe("SignupPage", () => {
  const strongPassword = "ValidPass1!";

  test("renders all required input fields", async () => {
    renderWithProviders(<SignupPage />);
    expect(await screen.findByLabelText(/organization/i)).toBeInTheDocument();

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  test("allows typing into all fields", async () => {
    renderWithProviders(<SignupPage />);

    await screen.findByLabelText(/organization/i);

    fireEvent.change(screen.getByLabelText(/full name/i), {
      target: { value: "Bruce Lee" },
    });
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "abc@xyz.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: strongPassword },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: strongPassword },
    });

    expect(screen.getByLabelText(/email/i).value).toBe("abc@xyz.com");
    expect(screen.getByLabelText(/^password$/i).value).toBe(strongPassword);
  });


  test("renders sign-in link", () => {
    renderWithProviders(<SignupPage />);
    expect(screen.getByText(/back to sign in/i)).toBeInTheDocument();
  });
});
