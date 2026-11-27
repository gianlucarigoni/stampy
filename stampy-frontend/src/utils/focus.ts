/** Pattern 5.2: after a failed validation on tap, focus goes to the first invalid control inside `root`. */
export function focusFirstInvalid(root: ParentNode | null | undefined): boolean {
  const el = root?.querySelector<HTMLElement>('[aria-invalid="true"]')
  el?.focus()
  return !!el
}
