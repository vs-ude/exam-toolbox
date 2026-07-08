describe('Authentication Flow', () => {
  it('Logs in as admin and then logs out', () => {
    cy.login('admin');
    cy.url().should('not.include', '/auth');

    cy.contains('Logout').click();
    cy.url().should('include', '/auth');
    cy.contains('Sign In').should('be.visible');
  });
});
