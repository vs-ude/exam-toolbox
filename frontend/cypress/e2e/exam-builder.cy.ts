describe("Exam Builder Drag and Drop and create pdf preview", () => {
  beforeEach(() => {
    cy.login("admin");
    cy.get('[data-cy="add-exam"]').click();
    cy.url().should("include", "/create-exam");
  });

  it("Drag a Short Answer block and generate a PDF preview", () => {
    // Drag and Drop
    const dataTransfer = new DataTransfer();

    cy.get('[data-cy="short-answer"]').trigger("dragstart", { dataTransfer });
    cy.get('[data-cy="dropzone"]').trigger("dragover", { dataTransfer });
    cy.get('[data-cy="short-answer"]').trigger("dragend", {
      dataTransfer,
      force: true,
    });
    cy.get('[data-cy="dropzone"]')
      .contains("Assignment 1.a")
      .should("be.visible");

    // insert required exam meta-data
    cy.get('[data-cy="examiner-input"]').type("Dr. Cypress");
    cy.get('[data-cy="date-input"]').type("2026-12-24");
    cy.get('[data-cy="semester-select"]').click();
    cy.get("mat-option").first().click();

    // generate preview PDF
    cy.get('[data-cy="preview-btn"]').click();

    // check if preview is generated
    cy.get(".preview-tab", { timeout: 15000 }).should("be.visible").click();
    cy.get("iframe")
      .should("be.visible")
      .and(($iframe) => {
        expect($iframe.attr("src")).to.contain("blob:");
      });
  });
});
