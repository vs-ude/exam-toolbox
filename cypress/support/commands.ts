Cypress.Commands.add('login', (role = 'admin') => {
  cy.clearCookies();
  cy.clearLocalStorage();
  cy.visit('/');

  cy.fixture('credentials').then(creds => {
    // Select the correct credentials based on the role requested
    const user = creds[role];

    cy.get('input[name="username"]').type(user.username);

    cy.get('input[name="password"]').type(user.password);
    cy.get('button[type="submit"]').click();

    cy.visit('/#/dashboard');
  });
});

declare namespace Cypress {
  interface Chainable {
    // role is optional (?) and should be a string
    login(role?: string): Chainable<void>;
  }
}
