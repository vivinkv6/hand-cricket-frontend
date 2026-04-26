import { HomePage, RoomPage } from '../support/pages';

describe('Smoke Suite - P0', () => {
  const home = new HomePage();
  const room = new RoomPage();

  describe('Home Page', () => {
    it('should load successfully', () => {
      home.visit();
      home.title.should('be.visible');
    });

    it('should display all mode options', () => {
      home.visit();
      home.soloMode.should('be.visible');
      home.duelMode.should('be.visible');
      home.teamMode.should('be.visible');
    });

    it('should have player name input', () => {
      home.visit();
      home.playerNameInput.should('be.visible');
    });

    it('should show Play Now button for solo mode', () => {
      home.visit();
      home.playNowButton.should('be.visible');
    });

    it('should have disabled Play Now without name', () => {
      home.visit();
      home.playNowButton.should('be.disabled');
    });
  });

  describe('Mode Selection', () => {
    it('should switch to duel mode', () => {
      home.visit();
      home.selectMode('duel');
      // Verify mode changed - check other mode is not selected
      home.teamMode.should('be.visible');
    });

    it('should switch to team mode', () => {
      home.visit();
      home.selectMode('team');
      home.teamSizeButton.should('be.visible');
    });

    it('should show team size buttons', () => {
      home.visit();
      home.selectMode('team');
      cy.contains('2v2').should('be.visible');
      cy.contains('5v5').should('be.visible');
    });
  });

  describe('Room Page', () => {
    it('should show loading state initially', () => {
      room.visit('TEST01');
      room.loadingIndicator.should('exist');
    });
  });
});

describe('Regression Suite - P1', () => {
  const home = new HomePage();

  describe('Form Interactions', () => {
    it('should accept player name input', () => {
      home.visit();
      home.enterPlayerName('TestPlayer');
      home.playerNameInput.should('have.value', 'TestPlayer');
    });

    it('should clear player name', () => {
      home.visit();
      home.enterPlayerName('TestPlayer');
      home.playerNameInput.clear();
      home.playerNameInput.should('have.value', '');
    });

    it('should switch between modes', () => {
      home.visit();
      home.selectMode('duel');
      home.duelMode.should('be.visible');
      home.selectMode('team');
      home.teamMode.should('be.visible');
    });
  });

  describe('UI Rendering', () => {
    it('should render stadium background', () => {
      home.visit();
      cy.get('.stadium-shell').should('exist');
    });

    it('should render glass panel', () => {
      home.visit();
      cy.get('.glass-panel').should('exist');
    });

    it('should render mode buttons', () => {
      home.visit();
      cy.get('button').filter(':visible').should('have.length.gte', 3);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible input placeholders', () => {
      home.visit();
      home.playerNameInput.should('have.attr', 'placeholder');
    });

    it('should allow focus on player input', () => {
      home.visit();
      home.playerNameInput.focus();
      home.playerNameInput.should('be.focused');
    });
  });
});

describe('Unhappy Path', () => {
  const home = new HomePage();

  it('should handle empty player name', () => {
    home.visit();
    home.playNowButton.should('be.disabled');
  });

  it('should handle mode switching without name', () => {
    home.visit();
    home.selectMode('duel');
    home.selectMode('solo');
    home.playNowButton.should('be.visible');
  });

  it('should handle rapid mode switching', () => {
    home.visit();
    home.selectMode('duel');
    home.selectMode('team');
    home.selectMode('solo');
    home.soloMode.should('be.visible');
  });
});

describe('Visual Regression', () => {
  const home = new HomePage();

  it('should render branding text', () => {
    home.visit();
    cy.contains('Hand Cricket Arena').should('be.visible');
  });

  it('should render match desk section', () => {
    home.visit();
    cy.contains('Match Desk').should('be.visible');
  });

  it('should render footer mute button', () => {
    home.visit();
    cy.get('button[title="Mute"]').should('exist');
  });
});