import TerminalShell from '@/components/TerminalShell';
export default function Layout({ children }: { children: React.ReactNode }) {
	return <TerminalShell title="Visual AI">{children}</TerminalShell>;
}
