export default function AppLogo() {
    return (
        <div className="flex items-center gap-2">
            <img
                src="/images/logo_lelco_dark.png"
                alt="Lelco Manufacturing"
                className="h-7 w-auto object-contain dark:hidden"
            />
            <img
                src="/images/logo_lelco_white.png"
                alt="Lelco Manufacturing"
                className="hidden h-7 w-auto object-contain dark:block"
            />
        </div>
    );
}
