describe("User Permissions and Role-Based Access", () => {
  const examName = "Admin Secret Physics Exam " + Date.now();

  it("Admin: Can create, save, and see the exam in the pool", () => {
    cy.login("admin");
    cy.get('[data-cy="add-exam"]').click();

    // Fill exam metadata
    cy.get('[data-cy="exam-name-display"]').click();
    cy.get('[data-cy="exam-name-input"]').type(`${examName}{enter}`);
    cy.get('[data-cy="examiner-input"]').type("Dr. Admin");
    cy.get('[data-cy="date-input"]').type("2026-10-10");
    cy.get('[data-cy="semester-select"]').click();
    cy.get("mat-option").first().click();

    // Intercept the specific save call from ApiService
    cy.intercept("POST", "/api/exams").as("saveExam");

    // Save and verify network success
    cy.get('[data-cy="save"]').click();
    cy.wait("@saveExam").its("response.statusCode").should("eq", 200);

    // Verify it appears in the Exam Pool
    cy.visit("/dashboard");
    cy.get('[data-cy="exams-pool"]').click();
    cy.contains(examName).should("be.visible");
  });

  it("Student: Is denied access to save and see the admin's exam", () => {
    // Intercept the specific save call from ApiService
    cy.intercept("GET", "/api/exams").as("getExams");

    cy.login("student");
    cy.visit("/dashboard");

    // Verify API Denial for fetching exams
    cy.get('[data-cy="exams-pool"]').click();

    // Even if the UI tries to load, the student shouldn't see the admin's exam
    cy.wait("@getExams").then((interception) => {
      expect(interception.response?.statusCode).to.be.oneOf([401, 403]);
    });
    cy.contains(examName).should("not.exist");

    // Verify API Denial for saving
    cy.visit("https://localhost/#/dashboard");
    cy.get('[data-cy="add-exam"]').click();
    cy.intercept("POST", "/api/exams").as("deniedSave");

    // Fill out only minimally required fields to click save
    cy.get('[data-cy="examiner-input"]').type("Student Try");
    cy.get('[data-cy="date-input"]').type("2026-12-24");
    cy.get('[data-cy="semester-select"]').click();
    cy.get("mat-option").first().click();
    cy.get('[data-cy="save"]').click();

    // Backend must reject this
    cy.wait("@deniedSave")
      .its("response.statusCode")
      .should("be.oneOf", [401, 403]);

    // Verify it does not appears in the Exam Pool
    cy.visit("https://localhost/#/exams-pool");
    cy.contains(examName).should("not.exist");
  });
});
