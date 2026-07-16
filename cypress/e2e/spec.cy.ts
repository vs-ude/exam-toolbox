describe('Navigate to init page', () => {
  it('Visits the initial project page and should redirect to login', () => {
    cy.visit('/');
    cy.url().should('include', '/login');
    cy.get('button[name="login"]').should('be.visible');
  });
});
