import { FC, ReactNode } from 'react';

export interface btnLinkProps {
	url: string;
	label: string;
	icon?: ReactNode;
}

const BtnLink: FC<btnLinkProps> = ({ url, label, icon }) => {
	return (
		<a
			target="_blank"
			href={url}
			className={
				'flex flex-row gap-x-2 rounded-md px-4 py-2 text-green-700 transition ease-in-out hover:bg-green-100'
			}
			rel="noreferrer"
		>
			{icon} {label}
		</a>
	);
};

export default BtnLink;
