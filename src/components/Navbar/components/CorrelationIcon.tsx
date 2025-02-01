import { forwardRef } from 'react';

export const CorrelationIcon = forwardRef<
	SVGSVGElement,
	{
		stroke?: string;
		strokeWidth?: number;
	}
>(({ stroke, strokeWidth }, ref) => (
	<svg ref={ref} height="1.2rem" width="1.2rem" viewBox="0 0 32 26" fill="none" xmlns="http://www.w3.org/2000/svg">
		<g clipPath="url(#clip0_481_602)">
			<path
				d="M16.3953 21.6621L18.0485 23.3153C18.4869 23.7537 19.0815 24 19.7015 24C20.3215 24 20.9161 23.7537 21.3545 23.3153L27.9669 16.7029C28.4053 16.2645 28.6516 15.6699 28.6516 15.0499C28.6516 14.4299 28.4053 13.8353 27.9669 13.3969L21.3545 6.78457C20.9161 6.34615 20.3215 6.09985 19.7015 6.09985C19.0815 6.09985 18.4869 6.34615 18.0485 6.78457L11.4362 13.3969C10.9978 13.8353 10.7515 14.4299 10.7515 15.0499C10.7515 15.6699 10.9978 16.2645 11.4362 16.7029L13.0893 18.3561"
				stroke={stroke}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M13.0892 8.43764L11.4361 6.78457C10.9977 6.34615 10.4031 6.09985 9.78305 6.09985C9.16303 6.09985 8.56841 6.34615 8.12999 6.78457L1.51772 13.3969C1.07931 13.8353 0.833008 14.4299 0.833008 15.0499C0.833008 15.6699 1.07931 16.2645 1.51772 16.7029L8.12999 23.3153C8.56841 23.7537 9.16303 24 9.78305 24C10.4031 24 10.9977 23.7537 11.4361 23.3153L18.0484 16.7029C18.4868 16.2645 18.7332 15.6699 18.7332 15.0499C18.7332 14.4299 18.4868 13.8353 18.0484 13.3969L16.3953 11.7438"
				stroke={stroke}
				strokeWidth={strokeWidth}
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<rect x="7" y="-0.199951" width="25" height="10.5" rx="3" fill="#2DD4BF" />
			<path
				d="M11.5503 5.49194H9.90674L9.89795 4.58667H11.2778C11.521 4.58667 11.7202 4.55591 11.8755 4.49438C12.0308 4.42993 12.1465 4.33765 12.2227 4.21753C12.3018 4.09448 12.3413 3.94507 12.3413 3.76929C12.3413 3.57007 12.3032 3.40894 12.2271 3.28589C12.1538 3.16284 12.0381 3.07349 11.8799 3.01782C11.7246 2.96216 11.5239 2.93433 11.2778 2.93433H10.3638V8.30005H9.04541V1.90161H11.2778C11.6499 1.90161 11.9824 1.93677 12.2754 2.00708C12.5713 2.07739 12.8218 2.18433 13.0269 2.32788C13.2319 2.47144 13.3887 2.65308 13.4971 2.8728C13.6055 3.0896 13.6597 3.34741 13.6597 3.64624C13.6597 3.90991 13.5996 4.15308 13.4795 4.37573C13.3623 4.59839 13.1763 4.78003 12.9214 4.92065C12.6694 5.06128 12.3398 5.13892 11.9326 5.15356L11.5503 5.49194ZM11.4932 8.30005H9.54639L10.0605 7.27173H11.4932C11.7246 7.27173 11.9136 7.23511 12.0601 7.16187C12.2065 7.08569 12.3149 6.98315 12.3853 6.85425C12.4556 6.72534 12.4907 6.57739 12.4907 6.4104C12.4907 6.2229 12.4585 6.0603 12.394 5.92261C12.3325 5.78491 12.2329 5.67944 12.0952 5.6062C11.9575 5.53003 11.7759 5.49194 11.5503 5.49194H10.2803L10.2891 4.58667H11.8711L12.1743 4.94263C12.564 4.93677 12.8774 5.00562 13.1147 5.14917C13.355 5.28979 13.5293 5.4729 13.6377 5.69849C13.749 5.92407 13.8047 6.16577 13.8047 6.42358C13.8047 6.83374 13.7153 7.17944 13.5366 7.46069C13.3579 7.73901 13.0957 7.94849 12.75 8.08911C12.4072 8.22974 11.9883 8.30005 11.4932 8.30005ZM19.0869 7.27173V8.30005H15.6812V7.27173H19.0869ZM16.1118 1.90161V8.30005H14.7935V1.90161H16.1118ZM18.6431 4.50757V5.50952H15.6812V4.50757H18.6431ZM19.0825 1.90161V2.93433H15.6812V1.90161H19.0825ZM22.8047 1.90161V8.30005H21.4907V1.90161H22.8047ZM24.7734 1.90161V2.93433H19.5527V1.90161H24.7734ZM27.6519 2.99585L25.9116 8.30005H24.5098L26.8872 1.90161H27.7793L27.6519 2.99585ZM29.0977 8.30005L27.353 2.99585L27.2124 1.90161H28.1133L30.5039 8.30005H29.0977ZM29.0186 5.91821V6.95093H25.6392V5.91821H29.0186Z"
				fill="black"
			/>
		</g>
	</svg>
));

CorrelationIcon.displayName = 'CorrelationIcon';
