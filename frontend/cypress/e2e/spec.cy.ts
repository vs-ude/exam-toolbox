describe("Navigate to init page", () => {
  it("Visits the initial project page and should redirect to login", () => {
    cy.visit("/");
    cy.url().should("include", "/auth");
    cy.contains("Sign In").should("be.visible");
  });
});
