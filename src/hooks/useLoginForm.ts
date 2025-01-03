import { loginIn } from '@/api/auth';
import { notifyError } from '@/utils/notification';
import { useForm } from '@mantine/form';
import { hideNotification } from '@mantine/notifications';
import { StatusCodes } from 'http-status-codes';
import useMountedState from './useMountedState';
import { useLocation, useNavigate } from 'react-router-dom';
import { HOME_ROUTE } from '@/constants/routes';
import { useId } from '@mantine/hooks';
import { useEffect } from 'react';
import Cookies from 'js-cookie';
import { useGetQueryParam } from '@/utils';
import { isAxiosError } from 'axios';
import _ from 'lodash';

export const useLoginForm = () => {
	const notificationId = useId();
	const queryParams = useGetQueryParam();
	const [loading, setLoading] = useMountedState(false);
	const [error, setError] = useMountedState<string | null>(null);
	const auth = Cookies.get('session');
	const nav = useNavigate();
	const location = useLocation();

	useEffect(() => {
		if (auth) {
			nav(
				{
					pathname: HOME_ROUTE,
				},
				{ replace: true },
			);
		}
	}, []);

	const form = useForm({
		initialValues: {
			username: queryParams.username ?? '',
			password: queryParams.password ?? '',
		},
		validate: {
			username: (value) => (value ? null : ''),
			password: (value) => (value ? null : ''),
		},
		transformValues: (values) => {
			return {
				username: values.username.trim(),
				password: values.password.trim(),
			};
		},
	});

	const handleSubmit = () => {
		return form.onSubmit(async (data) => {
			try {
				setLoading(true);
				setError(null);
				hideNotification(notificationId);

				const res = await loginIn(data.username, data.password);

				switch (res.status) {
					case StatusCodes.OK: {
						const pathname = location.state?.from?.pathname || HOME_ROUTE;
						nav(
							{
								pathname,
							},
							{ replace: true },
						);

						break;
					}
					case StatusCodes.UNAUTHORIZED: {
						setError('Invalid credential');
						break;
					}
					default: {
						setError('Request Failed!');
					}
				}
			} catch (err) {
				if (isAxiosError(err)) {
					const errStatus = err.response?.status;
					if (errStatus === 401) {
						setError('Unauthorized User');
						notifyError({ message: 'The request failed with a status code of 401' });
					} else {
						const errMsg = _.isString(err.response?.data)
							? err.response?.data || 'Something went wrong'
							: 'Something went wrong';
						setError(errMsg);
						notifyError({ message: errMsg });
					}
				} else {
					setError('Request Failed!');
					notifyError({ message: 'Something went wrong' });
				}
			} finally {
				setLoading(false);
			}
		});
	};

	return { ...form, loading, handleSubmit, error };
};
