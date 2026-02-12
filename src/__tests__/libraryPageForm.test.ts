import { resolveConversationType, validateLibraryPageForm } from '../utils/libraryPageForm';

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected: ${String(expected)}. Received: ${String(actual)}`);
  }
}

function testResolveConversationType() {
  assertEqual(resolveConversationType('chat-abc123'), 'chat-abc123', 'conversation type should be returned as-is when valid');
  assertEqual(resolveConversationType(' finance-research-xyz '), 'finance-research-xyz', 'conversation type should be trimmed');
  assertEqual(resolveConversationType(''), '', 'empty values should remain empty');
}

function testValidationRejectsUnknownSelections() {
  const message = validateLibraryPageForm({
    pageName: 'Library Page',
    conversationType: 'library-page-abc123',
    defaultProjectSlug: 'missing-project',
    defaultPersonaId: '',
    defaultModelKey: '',
    projectOptions: [{ value: '' }, { value: 'alpha' }],
    personaOptions: [{ value: '' }, { value: 'persona-1' }],
    modelOptions: [{ value: '' }, { value: 'ollama::primary::phi4' }],
  });

  assertEqual(message, 'Selected default project is no longer available', 'unknown project should be rejected');
}

function testValidationRequiresConversationType() {
  const message = validateLibraryPageForm({
    pageName: 'Library Page',
    conversationType: '',
    defaultProjectSlug: '',
    defaultPersonaId: '',
    defaultModelKey: '',
    projectOptions: [{ value: '' }, { value: 'alpha' }],
    personaOptions: [{ value: '' }, { value: 'persona-1' }],
    modelOptions: [{ value: '' }, { value: 'ollama::primary::phi4' }],
  });

  assertEqual(message, 'Conversation type is required and must be unique per page', 'empty conversation type should be rejected');
}

function testValidationAcceptsKnownSelections() {
  const message = validateLibraryPageForm({
    pageName: 'Library Page',
    conversationType: 'library-finance-chat-abc123',
    defaultProjectSlug: 'alpha',
    defaultPersonaId: 'persona-1',
    defaultModelKey: 'ollama::primary::phi4',
    projectOptions: [{ value: '' }, { value: 'alpha' }],
    personaOptions: [{ value: '' }, { value: 'persona-1' }],
    modelOptions: [{ value: '' }, { value: 'ollama::primary::phi4' }],
  });

  assertEqual(message, null, 'known selections with conversation namespace should validate');
}

function run() {
  testResolveConversationType();
  testValidationRejectsUnknownSelections();
  testValidationRequiresConversationType();
  testValidationAcceptsKnownSelections();
  console.log('libraryPageForm.test.ts: all assertions passed');
}

run();
