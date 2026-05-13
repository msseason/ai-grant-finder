import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import IndustryTagInput from '../components/IndustryTagInput'

// Shared wrapper to render with a controlled value
function renderTagInput(initialTags: string[] = []) {
  let currentTags = [...initialTags]
  const onChange = vi.fn((tags: string[]) => {
    currentTags = tags
  })

  const utils = render(
    <IndustryTagInput value={currentTags} onChange={onChange} />
  )

  return { ...utils, onChange, getCurrentTags: () => currentTags }
}

// Helper to get the hidden text input inside the component
function getInput(): HTMLInputElement {
  return screen.getByRole('textbox') as HTMLInputElement
}

// ---------- Basic rendering ----------

describe('IndustryTagInput — rendering', () => {
  it('renders without crashing', () => {
    renderTagInput()
    expect(getInput()).toBeInTheDocument()
  })

  it('renders existing tags', () => {
    renderTagInput(['Agriculture', 'Healthcare'])
    expect(screen.getByText('Agriculture')).toBeInTheDocument()
    expect(screen.getByText('Healthcare')).toBeInTheDocument()
  })

  it('shows placeholder when no tags', () => {
    renderTagInput([])
    expect(getInput().placeholder).toContain('Type a sector')
  })
})

// ---------- Add tag on Enter ----------

describe('IndustryTagInput — add tag on Enter', () => {
  it('calls onChange with new tag when Enter pressed', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<IndustryTagInput value={[]} onChange={onChange} />)

    const input = getInput()
    await user.type(input, 'Technology')
    await user.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledWith(['Technology'])
  })

  it('calls onChange with new tag when comma pressed', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<IndustryTagInput value={[]} onChange={onChange} />)

    const input = getInput()
    await user.type(input, 'Education,')

    expect(onChange).toHaveBeenCalledWith(['Education'])
  })

  it('trims whitespace from tag', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<IndustryTagInput value={[]} onChange={onChange} />)

    const input = getInput()
    await user.type(input, '  STEM  ')
    await user.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledWith(['STEM'])
  })

  it('does not add empty tag on Enter', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<IndustryTagInput value={[]} onChange={onChange} />)

    const input = getInput()
    await user.keyboard('{Enter}')

    expect(onChange).not.toHaveBeenCalled()
  })
})

// ---------- Remove tag on Backspace ----------

describe('IndustryTagInput — remove tag on Backspace', () => {
  it('removes last tag on Backspace when input is empty', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<IndustryTagInput value={['Agriculture', 'Healthcare']} onChange={onChange} />)

    const input = getInput()
    await user.click(input)
    await user.keyboard('{Backspace}')

    expect(onChange).toHaveBeenCalledWith(['Agriculture'])
  })

  it('does not remove tag on Backspace when input has content', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<IndustryTagInput value={['Agriculture']} onChange={onChange} />)

    const input = getInput()
    await user.type(input, 'Tech')
    await user.keyboard('{Backspace}')

    // Backspace should erase 'h' from 'Tech', NOT remove the tag
    expect(onChange).not.toHaveBeenCalled()
  })
})

// ---------- Remove tag via X button ----------

describe('IndustryTagInput — remove tag via X button', () => {
  it('removes a specific tag when its X button is clicked', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<IndustryTagInput value={['Agriculture', 'Healthcare']} onChange={onChange} />)

    // Find all X buttons (they are SVG buttons inside tag spans)
    const removeButtons = screen.getAllByRole('button')
    // The first remove button corresponds to the first tag
    await user.click(removeButtons[0])

    expect(onChange).toHaveBeenCalledWith(['Healthcare'])
  })
})

// ---------- Prevent duplicates ----------

describe('IndustryTagInput — duplicate prevention', () => {
  it('does not call onChange when adding a duplicate tag', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<IndustryTagInput value={['Agriculture']} onChange={onChange} />)

    const input = getInput()
    await user.type(input, 'Agriculture')
    await user.keyboard('{Enter}')

    expect(onChange).not.toHaveBeenCalled()
  })
})

// ---------- Suggestion dropdown ----------

describe('IndustryTagInput — suggestions dropdown', () => {
  it('shows suggestions dropdown on focus', async () => {
    const user = userEvent.setup()
    renderTagInput([])

    const input = getInput()
    await user.click(input)

    // The dropdown shows "Common sectors" label
    await waitFor(() => {
      expect(screen.getByText('Common sectors')).toBeInTheDocument()
    })
  })

  it('filters suggestions based on input', async () => {
    const user = userEvent.setup()
    renderTagInput([])

    const input = getInput()
    await user.type(input, 'health')

    await waitFor(() => {
      expect(screen.getByText('Healthcare')).toBeInTheDocument()
      expect(screen.getByText('Suggestions')).toBeInTheDocument()
    })
    // 'Agriculture' should not appear when filtering by 'health'
    expect(screen.queryByText('Agriculture')).not.toBeInTheDocument()
  })

  it('adds tag when suggestion is clicked via mouseDown', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<IndustryTagInput value={[]} onChange={onChange} />)

    const input = getInput()
    await user.click(input)

    await waitFor(() => {
      expect(screen.getByText('Nonprofits')).toBeInTheDocument()
    })

    // Use mouseDown (as per the component implementation)
    fireEvent.mouseDown(screen.getByText('Nonprofits'))

    expect(onChange).toHaveBeenCalledWith(['Nonprofits'])
  })

  it('shows "Add <custom>" option for unrecognized input', () => {
    render(<IndustryTagInput value={[]} onChange={vi.fn()} />)

    const input = getInput()
    // Use fireEvent directly to bypass userEvent blur timing issues
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'QuantumComputing' } })

    // The component renders: Add "{input}" — check for text containing Add + the custom value
    const addBtn = screen.queryByText((content) =>
      content.includes('Add') && content.includes('QuantumComputing')
    )
    expect(addBtn).toBeInTheDocument()
  })

  it('adds custom tag via "Add" button mouseDown', () => {
    const onChange = vi.fn()
    render(<IndustryTagInput value={[]} onChange={onChange} />)

    const input = getInput()
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'QuantumComputing' } })

    const addBtn = screen.getByText((content) =>
      content.includes('Add') && content.includes('QuantumComputing')
    )
    fireEvent.mouseDown(addBtn)

    expect(onChange).toHaveBeenCalledWith(['QuantumComputing'])
  })

  it('does not show already-added suggestions in dropdown', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<IndustryTagInput value={['Nonprofits']} onChange={onChange} />)

    const input = getInput()
    await user.click(input)

    // 'Nonprofits' is already a tag, so it should not appear in dropdown
    await waitFor(() => {
      expect(screen.getByText('Common sectors')).toBeInTheDocument()
    })

    // Check that the text 'Nonprofits' only appears once (the tag itself, not in dropdown)
    const instances = screen.getAllByText('Nonprofits')
    expect(instances).toHaveLength(1) // only the tag chip, not a suggestion
  })
})
