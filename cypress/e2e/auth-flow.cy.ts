describe('Authentication Flow', () => {
  it('Logs in as admin and then logs out', () => {
    cy.login('admin');
    cy.url().should('not.include', '/login');

    cy.get('button[name="logout"]').click();
    cy.url().should('include', '/login');
    cy.get('button[name="login"]').should('be.visible');
  });
});
