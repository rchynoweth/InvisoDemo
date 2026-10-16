import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthContext, type AuthContextValue } from '@/hooks/auth.context';

const submitOverall = vi.fn();
const submitRating = vi.fn();
const myRatedQuestionNumbers = vi.fn();
const loadAnalytics = vi.fn();
const loadGuidedQuestions = vi.fn();
const addGuidedQuestion = vi.fn();
const updateGuidedQuestion = vi.fn();

// All server calls go through lib/data, so that's the one module to fake.
vi.mock('@/lib/data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/data')>()),
  submitOverall: (...a: unknown[]) => submitOverall(...a),
  submitRating: (...a: unknown[]) => submitRating(...a),
  myRatedQuestionNumbers: () => myRatedQuestionNumbers(),
  loadAnalytics: () => loadAnalytics(),
  loadGuidedQuestions: (...a: unknown[]) => loadGuidedQuestions(...a),
  addGuidedQuestion: (...a: unknown[]) => addGuidedQuestion(...a),
  updateGuidedQuestion: (...a: unknown[]) => updateGuidedQuestion(...a),
}));

const QUESTIONS = [
  { id: 'q1', questionNumber: 1, topic: 'Topic A', text: 'Sample question one?', derived: false, active: true },
  { id: 'q2', questionNumber: 2, topic: 'Topic A', text: 'Sample question two?', derived: true, active: true },
  { id: 'q3', questionNumber: 5, topic: 'Topic B', text: 'Sample question five?', derived: false, active: true },
];

// Who counts as an admin comes from deployment config; tests use a placeholder.
vi.stubEnv('VITE_RAYFIN_ANALYTICS_ADMINS', 'admin@example.com');

import App from '@/App';

const auth: AuthContextValue = {
  session: {
    user: { id: 'sub-1', email: 'ana@contoso.com' },
    isAuthenticated: true,
    isAnonymous: false,
  },
  isAuthenticated: true,
  isLoading: false,
  canSignIn: true,
  signIn: async () => {},
  isSigningIn: false,
  signInError: null,
  config: { kind: 'ready' },
  error: null,
};

function renderApp(value: AuthContextValue = auth) {
  return render(
    <AuthContext.Provider value={value}>
      <App />
    </AuthContext.Provider>
  );
}

function pick(groupName: string, option: string) {
  const group = screen.getByRole('group', { name: new RegExp(groupName) });
  const radio = Array.from(group.querySelectorAll('label')).find(
    (l) => l.textContent === option
  );
  fireEvent.click(radio!);
}

describe('App', () => {
  beforeEach(() => {
    submitOverall.mockReset().mockResolvedValue(undefined);
    submitRating.mockReset().mockResolvedValue(undefined);
    myRatedQuestionNumbers.mockReset().mockResolvedValue(new Set<number>());
    loadAnalytics.mockReset().mockResolvedValue({ overall: [], ratings: [], guidedQuestions: QUESTIONS });
    loadGuidedQuestions.mockReset().mockResolvedValue(QUESTIONS);
    addGuidedQuestion.mockReset().mockImplementation(async (q: object) => ({ id: 'new', ...q }));
    updateGuidedQuestion.mockReset().mockResolvedValue(undefined);
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('shows who is responding and asks no agent question', () => {
    renderApp();
    expect(screen.getByText('Responding as ana@contoso.com')).toBeVisible();
    expect(screen.queryByLabelText(/data agent/i)).toBeNull();
  });

  it('keeps overall feedback disabled until required answers are given, then saves', async () => {
    renderApp();
    fireEvent.click(screen.getByRole('tab', { name: /Overall feedback/ }));
    const submit = screen.getByRole('button', { name: 'Submit feedback' });
    expect(submit).toBeDisabled();

    pick('recommend', '9');
    pick('Overall experience', '4');
    pick('keep using', 'Yes, pending improvements');
    expect(submit).toBeEnabled();

    await act(async () => fireEvent.click(submit));
    expect(submitOverall).toHaveBeenCalledWith(
      expect.objectContaining({
        npsScore: 9,
        overallRating: 4,
        continueUsing: 'PendingImprovements',
      })
    );
    expect(await screen.findByText('Thanks, your feedback is in.')).toBeVisible();
  });

  it('rates an answer and clears the form for the next one', async () => {
    renderApp();
    fireEvent.click(screen.getByRole('tab', { name: /Rate an answer/ }));

    fireEvent.change(screen.getByLabelText(/What did you ask/), {
      target: { value: 'Revenue by region last quarter?' },
    });
    for (const dim of ['Accuracy', 'Business usefulness', 'Completeness', 'Clarity']) {
      pick(dim, '5');
    }

    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Submit rating' }))
    );
    expect(submitRating).toHaveBeenCalledWith(
      expect.objectContaining({
        question: 'Revenue by region last quarter?',
        ratings: { accuracy: 5, usefulness: 5, completeness: 5, clarity: 5 },
      })
    );
    expect(await screen.findByText(/Saved\. Rate another answer/)).toBeVisible();
    expect(screen.getByLabelText(/What did you ask/)).toHaveValue('');
  });

  it('shows the error and keeps answers when saving fails', async () => {
    submitRating.mockRejectedValue(new Error('Permission denied.'));
    renderApp();
    fireEvent.click(screen.getByRole('tab', { name: /Rate an answer/ }));
    fireEvent.change(screen.getByLabelText(/What did you ask/), {
      target: { value: 'Top customers?' },
    });
    for (const dim of ['Accuracy', 'Business usefulness', 'Completeness', 'Clarity']) {
      pick(dim, '2');
    }
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Submit rating' }))
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Permission denied.');
    expect(screen.getByLabelText(/What did you ask/)).toHaveValue('Top customers?');
  });

  describe('guided questions', () => {
    it('opens on the first question the user has not rated yet', async () => {
      myRatedQuestionNumbers.mockResolvedValue(new Set([1, 2]));
      renderApp();
      expect(await screen.findByText('Question 3 of 3')).toBeVisible();
      expect(
        screen.getByText('Sample question five?')
      ).toBeVisible();
      expect(screen.getByText('2 of 3 done')).toBeVisible();
    });

    it('saves a rated answer and moves to the next question', async () => {
      renderApp();
      expect(await screen.findByText('Question 1 of 3')).toBeVisible();
      const save = screen.getByRole('button', { name: 'Save & next' });
      expect(save).toBeDisabled();

      pick('Did it answer', 'Partially');
      expect(save).toBeDisabled();
      for (const dim of ['Accuracy', 'Business usefulness', 'Completeness', 'Clarity']) {
        pick(dim, '3');
      }
      fireEvent.change(screen.getByLabelText(/Paste the agent's response/), {
        target: { value: 'Sample agent answer.' },
      });

      await act(async () => fireEvent.click(save));
      expect(submitRating).toHaveBeenCalledWith(
        expect.objectContaining({
          guidedQuestionNumber: 1,
          question: 'Sample question one?',
          answered: 'Partially',
          ratings: { accuracy: 3, usefulness: 3, completeness: 3, clarity: 3 },
          agentResponse: 'Sample agent answer.',
        })
      );
      expect(await screen.findByText('Question 2 of 3')).toBeVisible();
      expect(screen.getByText('1 of 3 done')).toBeVisible();
    });

    it('skips the scores when the agent could not answer', async () => {
      renderApp();
      await screen.findByText('Question 1 of 3');
      pick('Did it answer', 'No');
      expect(screen.queryByRole('group', { name: /Accuracy/ })).toBeNull();

      await act(async () =>
        fireEvent.click(screen.getByRole('button', { name: 'Save & next' }))
      );
      expect(submitRating).toHaveBeenCalledWith(
        expect.objectContaining({ guidedQuestionNumber: 1, answered: 'No', ratings: undefined })
      );
    });

    it('moves with Skip and Back without saving', async () => {
      renderApp();
      await screen.findByText('Question 1 of 3');
      expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
      expect(screen.getByText('Question 2 of 3')).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: 'Back' }));
      expect(screen.getByText('Question 1 of 3')).toBeVisible();
      expect(submitRating).not.toHaveBeenCalled();
    });

    it('still starts when earlier progress cannot be loaded', async () => {
      myRatedQuestionNumbers.mockRejectedValue(new Error('offline'));
      renderApp();
      expect(await screen.findByText('Question 1 of 3')).toBeVisible();
      expect(screen.getByText(/Couldn't load your earlier progress/)).toBeVisible();
    });
  });

  describe('analytics', () => {
    const admin: AuthContextValue = {
      ...auth,
      session: { ...auth.session!, user: { id: 'sub-2', email: 'Admin@Example.com' } },
    };

    it('is not offered to regular users', () => {
      renderApp();
      expect(screen.queryByRole('button', { name: /Analytics/ })).toBeNull();
      expect(loadAnalytics).not.toHaveBeenCalled();
    });

    it('lets an admin open analytics built from every response', async () => {
      loadAnalytics.mockResolvedValue({
        overall: [
          { id: '1', userEmail: 'a@x.com', submittedAt: new Date(), npsScore: 10, overallRating: 5, continueUsing: 'Yes' },
          { id: '2', userEmail: 'b@x.com', submittedAt: new Date(), npsScore: 4, overallRating: 2, continueUsing: 'No', improvements: 'Wrong store totals' },
        ],
        guidedQuestions: QUESTIONS,
        ratings: [
          { id: '3', userEmail: 'a@x.com', submittedAt: new Date(), source: 'Guided', guidedQuestionNumber: 5, question: 'Sample question five?', answered: 'Yes', accuracy: 4, usefulness: 4, completeness: 4, clarity: 4 },
        ],
      });
      renderApp(admin);
      fireEvent.click(screen.getByRole('button', { name: /Analytics/ }));

      expect(await screen.findByRole('heading', { name: 'Overall performance' })).toBeVisible();
      expect(screen.getByRole('heading', { name: 'Feedback analytics' })).toBeVisible();
      expect(screen.getByText('Net Promoter Score').nextSibling).toHaveTextContent('0');
      expect(screen.getByRole('heading', { name: 'Question by question' })).toBeVisible();
      expect(screen.getByText('Wrong store totals')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('tab', { name: /Question ratings \(1\)/ }));
      expect(screen.getAllByText('Sample question five?').length).toBeGreaterThan(1);
    });

    it('shows an actionable error when the data cannot load', async () => {
      loadAnalytics.mockRejectedValue(new Error('Permission denied.'));
      renderApp(admin);
      fireEvent.click(screen.getByRole('button', { name: /Analytics/ }));
      expect(await screen.findByRole('alert')).toHaveTextContent('Permission denied.');
      expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
    });
  });

  describe('screenshots', () => {
    const png = () => new File([new Uint8Array([137, 80, 78, 71])], 'shot.png', { type: 'image/png' });

    it('attaches a pasted screenshot to a guided rating', async () => {
      const { container } = renderApp();
      await screen.findByText('Question 1 of 3');
      fireEvent.paste(container.querySelector('form')!, { clipboardData: { files: [png()] } });
      expect(screen.getByRole('img', { name: 'Screenshot 1' })).toBeInTheDocument();

      pick('Did it answer', 'No');
      await act(async () =>
        fireEvent.click(screen.getByRole('button', { name: 'Save & next' }))
      );
      expect(submitRating).toHaveBeenCalledWith(
        expect.objectContaining({ source: 'Guided', screenshots: [expect.any(File)] })
      );
    });

    it('ignores pasted text and accepts a browsed file on Rate an answer', async () => {
      const { container } = renderApp();
      fireEvent.click(screen.getByRole('tab', { name: /Rate an answer/ }));
      fireEvent.paste(container.querySelector('form')!, { clipboardData: { files: [] } });
      expect(screen.queryByRole('img', { name: /Screenshot/ })).toBeNull();

      fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [png(), png()] } });
      expect(screen.getAllByRole('img', { name: /Screenshot/ })).toHaveLength(2);
      fireEvent.click(screen.getByRole('button', { name: 'Remove screenshot 1' }));
      expect(screen.getAllByRole('img', { name: /Screenshot/ })).toHaveLength(1);
    });

    it('keeps the form and shows the reason when an upload is rejected', async () => {
      submitRating.mockRejectedValue(new Error('Screenshots must be 4 MB or smaller.'));
      const { container } = renderApp();
      await screen.findByText('Question 1 of 3');
      fireEvent.paste(container.querySelector('form')!, { clipboardData: { files: [png()] } });
      pick('Did it answer', 'No');
      await act(async () =>
        fireEvent.click(screen.getByRole('button', { name: 'Save & next' }))
      );
      expect(await screen.findByRole('alert')).toHaveTextContent('4 MB or smaller');
      expect(screen.getByText('Question 1 of 3')).toBeVisible();
    });
  });

  describe('guided questions from the database', () => {
    it('saves the question number from the table, not the position', async () => {
      myRatedQuestionNumbers.mockResolvedValue(new Set([1, 2]));
      renderApp();
      await screen.findByText('Question 3 of 3');
      pick('Did it answer', 'No');
      await act(async () =>
        fireEvent.click(screen.getByRole('button', { name: 'Save & finish' }))
      );
      expect(submitRating).toHaveBeenCalledWith(
        expect.objectContaining({ guidedQuestionNumber: 5, question: 'Sample question five?' })
      );
    });

    it('explains when no questions have been loaded yet', async () => {
      loadGuidedQuestions.mockResolvedValue([]);
      renderApp();
      expect(await screen.findByText('No guided questions yet')).toBeVisible();
    });

    it('offers a retry when the questions cannot load', async () => {
      loadGuidedQuestions.mockRejectedValueOnce(new Error('Network down.'));
      renderApp();
      expect(await screen.findByRole('alert')).toHaveTextContent('Network down.');
      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Try again' })));
      expect(await screen.findByText('Question 1 of 3')).toBeVisible();
    });
  });

  describe('settings', () => {
    const admin: AuthContextValue = {
      ...auth,
      session: { ...auth.session!, user: { id: 'sub-2', email: 'Admin@Example.com' } },
    };

    it('has no account menu for regular users', () => {
      renderApp();
      expect(screen.queryByRole('button', { name: /Account menu/ })).toBeNull();
      expect(screen.queryByRole('menuitem', { name: 'Settings' })).toBeNull();
    });

    it('lets an admin open Settings from the name dropdown and add a question', async () => {
      renderApp(admin);
      fireEvent.click(screen.getByRole('button', { name: /Account menu/ }));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
      expect(await screen.findByRole('heading', { name: 'Add a guided question' })).toBeVisible();
      expect(screen.getByText('Will be question #6')).toBeVisible();

      fireEvent.change(screen.getAllByLabelText('Topic', { selector: 'input' })[0], { target: { value: 'Topic C' } });
      fireEvent.change(screen.getByLabelText('Question', { selector: 'textarea' }), {
        target: { value: 'Brand new question?' },
      });
      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Add question' })));
      expect(addGuidedQuestion).toHaveBeenCalledWith({
        questionNumber: 6,
        topic: 'Topic C',
        text: 'Brand new question?',
        derived: false,
        active: true,
      });
      expect(await screen.findByText('Brand new question?')).toBeVisible();
    });

    it('retires a question without deleting it', async () => {
      renderApp(admin);
      fireEvent.click(screen.getByRole('button', { name: /Account menu/ }));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
      await screen.findByText('Sample question two?');
      await act(async () => fireEvent.click(screen.getAllByRole('button', { name: 'Retire' })[1]));
      expect(updateGuidedQuestion).toHaveBeenCalledWith('q2', { active: false });
      expect(await screen.findByRole('button', { name: 'Restore' })).toBeVisible();
    });
  });

  describe('bulk upload', () => {
    const admin: AuthContextValue = {
      ...auth,
      session: { ...auth.session!, user: { id: 'sub-2', email: 'admin@example.com' } },
    };

    it('previews pasted questions and adds them with consecutive numbers', async () => {
      renderApp(admin);
      fireEvent.click(screen.getByRole('button', { name: /Account menu/ }));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
      await screen.findByRole('heading', { name: 'Add several at once' });

      expect(screen.getAllByLabelText('Topic', { selector: 'input' })).toHaveLength(1); // no topic box in bulk
      fireEvent.change(screen.getByLabelText('Questions'), {
        target: { value: 'Sales | Totals for yesterday, last week, or last month?\nBest store?\nTopic A | Sample question one?' },
      });
      expect(screen.getByText('2 questions ready: #6–#7')).toBeVisible();
      expect(screen.getByText(/already in the list/)).toBeVisible();

      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Add 2 questions' })));
      expect(addGuidedQuestion).toHaveBeenNthCalledWith(1, {
        questionNumber: 6, topic: 'Sales', text: 'Totals for yesterday, last week, or last month?', derived: false, active: true,
      });
      expect(addGuidedQuestion).toHaveBeenNthCalledWith(2, {
        questionNumber: 7, topic: 'General', text: 'Best store?', derived: false, active: true,
      });
      expect(await screen.findByText('Added 2 questions.')).toBeVisible();
    });

    it('stops on a failure and leaves the rest to retry', async () => {
      addGuidedQuestion.mockResolvedValueOnce({ id: 'n1', questionNumber: 6, topic: 'T', text: 'One?', derived: false, active: true });
      addGuidedQuestion.mockRejectedValueOnce(new Error('Permission denied.'));
      renderApp(admin);
      fireEvent.click(screen.getByRole('button', { name: /Account menu/ }));
      fireEvent.click(screen.getByRole('menuitem', { name: 'Settings' }));
      await screen.findByRole('heading', { name: 'Add several at once' });
      fireEvent.change(screen.getByLabelText('Questions'), { target: { value: 'T | One?\nT | Two?\nT | Three?' } });
      await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Add 3 questions' })));
      expect(await screen.findByText(/Added 1 of 3, then stopped: Permission denied/)).toBeVisible();
      expect(screen.getByLabelText('Questions')).toHaveValue('T | Two?\nT | Three?');
    });
  });
});
