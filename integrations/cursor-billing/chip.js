const CHIP_ID = 'cursor-billing-chip';

export function mountBillingChip(shell, view) {
  if (!shell) return null;
  if (getComputedStyle(shell).position === 'static') shell.style.position = 'relative';
  let chip = shell.querySelector(`#${CHIP_ID}`);
  if (!chip) {
    chip = document.createElement('div');
    chip.id = CHIP_ID;
    chip.innerHTML = '<button type="button"></button><div></div>';
    shell.appendChild(chip);
  }
  const button = chip.querySelector('button');
  const tip = chip.querySelector('div');
  button.textContent = view?.label || '—';
  tip.textContent = view?.detail || 'Cursor 账单暂时读不到';
  button.setAttribute('aria-label', tip.textContent.replaceAll('\n', '，'));
  const show = () => { tip.style.display = 'block'; };
  const hide = () => { tip.style.display = ''; };
  button.onmouseenter = show;
  button.onmouseleave = hide;
  button.onfocus = show;
  button.onblur = hide;
  return chip;
}
