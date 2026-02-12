export interface LibraryPageSelectableOption {
  value: string;
}

export interface LibraryPageValidationInput {
  pageName: string;
  conversationType: string;
  defaultProjectSlug: string;
  defaultPersonaId: string;
  defaultModelKey: string;
  projectOptions: LibraryPageSelectableOption[];
  personaOptions: LibraryPageSelectableOption[];
  modelOptions: LibraryPageSelectableOption[];
}

export function resolveConversationType(conversationType: string): string {
  return (conversationType || '').trim();
}

function isKnownSelection(value: string, options: LibraryPageSelectableOption[]): boolean {
  if (!value) {
    return true;
  }
  return options.some((option) => option.value === value);
}

export function validateLibraryPageForm(input: LibraryPageValidationInput): string | null {
  if (!(input.pageName || '').trim()) {
    return 'Page name is required';
  }

  if (!resolveConversationType(input.conversationType)) {
    return 'Conversation type is required and must be unique per page';
  }

  if (!isKnownSelection(input.defaultProjectSlug, input.projectOptions || [])) {
    return 'Selected default project is no longer available';
  }

  if (!isKnownSelection(input.defaultPersonaId, input.personaOptions || [])) {
    return 'Selected default persona is no longer available';
  }

  if (!isKnownSelection(input.defaultModelKey, input.modelOptions || [])) {
    return 'Selected default model is no longer available';
  }

  return null;
}
