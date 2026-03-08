Cypress.Commands.add("login", (role = "admin") => {
  cy.visit("/");

  cy.fixture("credentials").then((creds) => {
    // Select the correct credentials based on the role requested
    const user = creds[role];

    cy.get('input[type="text"]').type(user.username);
    cy.contains("Proceed").click();

    cy.get('input[type="password"]').type(user.password);
    cy.contains("Authenticate").click();

    cy.visit("/#/dashboard");
  });
});

declare namespace Cypress {
  interface Chainable {
    // role is optional (?) and should be a string
    login(role?: string): Chainable<void>;
  }
}
