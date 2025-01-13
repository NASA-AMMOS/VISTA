import MCWSPersistenceProvider from '../MCWSPersistenceProvider';
import MCWSUserContainerProvider from '../MCWSUserContainerProvider';
import mcws from '../../services/mcws/mcws';

describe('MCWSNamespaceService', () => {
    let namespaceMIOs;
    let mockUserAPI;
    let mockOpenmct;
    let sharedRootDefinition;
    let inaccessibleSharedRootDefinition;
    let missingSharedRootDefinition;
    let sharedRootDefinitions;
    let containerRootDefinition;
    let missingContainerRootDefinition;
    let inaccessibleContainerRootDefinition;
    let containerRootDefinitions;
    let mcwsPersistenceProvider;
    let mcwsUserContainerProvider;

    beforeEach(() => {
        namespaceMIOs = {};

        spyOn(mcws, 'namespace');

        mcws.namespace.and.callFake((namespaceUrl) => {
            let namespace = namespaceMIOs[namespaceUrl];

            if (!namespace) {
                namespace = namespaceMIOs[namespaceUrl] = 
                    jasmine.createSpyObj(
                        `namespace:${namespaceUrl}`,
                        ['read', 'create']
                    );

                namespace.created = false;

                namespace.create.and.callFake(() => {
                    return Promise.resolve()
                        .then(() => {
                            namespace.created = true;
                            return [];
                        });
                });

                namespace.read.and.callFake(() => {
                    if (namespaceUrl.includes('missing') && !namespace.created) {
                        return Promise.reject({ status: 404 });
                    }
                    if (namespaceUrl.includes('inaccessible')) {
                        return Promise.reject({});
                    }
                    return Promise.resolve([]);
                });
            }

            return namespace;
        });

        mockUserAPI = jasmine.createSpyObj('userAPI', [
            'getCurrentUser'
        ]);

        mockUserAPI.getCurrentUser
            .and.returnValue(
                Promise.resolve({
                    id: 'someUser',
                    name: 'someUser'
                })
        );

        mockOpenmct = {
            user: mockUserAPI
        };

        sharedRootDefinition = {
            id: 'shared:root',
            key: 'shared',
            name: 'Shared',
            url: '/some/shared/namespace'
        };
        inaccessibleSharedRootDefinition = {
            id: 'inaccessible-shared:root',
            key: 'inaccessible-shared',
            name: 'Inaccessible Shared',
            url: '/inaccessible/shared/namespace'
        };
        missingSharedRootDefinition = {
            id: 'missing-shared:root',
            key: 'missing-shared',
            name: 'Missing Shared',
            url: '/missing/shared/namespace'
        };

        sharedRootDefinitions = [
            sharedRootDefinition,
            inaccessibleSharedRootDefinition,
            missingSharedRootDefinition
        ];

        containerRootDefinition = {
            id: 'personal',
            key: 'personal',
            name: 'personal',
            url: '/some/personal/namespace',
            containsNamespaces: true,
            childTemplate: {
                id: 'personal-${USER}:root',
                key: 'personal-${USER}',
                name: '${USER}',
                url: '/some/personal/namespace/${USER}'
            }
        };
        inaccessibleContainerRootDefinition = {
            id: 'inaccessible-personal',
            key: 'inaccessible-personal',
            name: 'inaccessible-personal',
            url: '/inaccessible/personal/namespace',
            containsNamespaces: true,
            childTemplate: {
                id: 'inaccessible-personal-${USER}:root',
                key: 'inaccessible-personal-${USER}',
                name: '${USER}',
                url: '/inaccessible/personal/namespace/${USER}'
            }
        };
        missingContainerRootDefinition = {
            id: 'missing-personal:container',
            key: 'missing-personal',
            name: 'missing-personal',
            url: '/missing/personal/namespace',
            containsNamespaces: true,
            childTemplate: {
                id: 'missing-personal-${USER}:root',
                key: 'missing-personal-${USER}',
                name: '${USER}',
                url: '/missing/personal/namespace/${USER}'
            }
        };

        containerRootDefinitions = [
            containerRootDefinition,
            missingContainerRootDefinition,
            inaccessibleContainerRootDefinition
        ];

        mcwsPersistenceProvider = new MCWSPersistenceProvider(
            mockOpenmct,
            sharedRootDefinitions.concat(containerRootDefinitions)
        );

        mcwsUserContainerProvider = new MCWSUserContainerProvider(
            mockOpenmct,
            containerRootDefinitions
        );
    });

    describe('getRootNamespaces in MCWSUserContainerProvider', () => {
        let result;

        beforeEach(async () => {
            result = await mcwsUserContainerProvider.getRootNamespaces();
        });

        it('returns container namespaces', () => {
            expect(result).toContain(containerRootDefinition);
        });

        it('creates missing container namespaces ', () => {
            expect(result).toContain(missingContainerRootDefinition);
        });

        it('removes inaccessible container namespaces', () => {
            expect(result)
                .not
                .toContain(inaccessibleContainerRootDefinition);
        });
    });

    describe('getRootNamespaces in MCWSPersistenceProvider', () => {
        let result;

        beforeEach(async () => {
            result = await mcwsPersistenceProvider.getRootNamespaces();
        });

        it('returns normal namespaces', () => {
            expect(result).toContain(sharedRootDefinition);
        });

        it('creates missing normal namespaces ', () => {
            expect(result).toContain(missingSharedRootDefinition);
        });

        it('removes inaccessible normal namespaces', () => {
            expect(result).not.toContain(inaccessibleSharedRootDefinition);
        });
    });

    describe('getContainedNamespaces', () => {
        let userRootNamespaceMIO,
            userNamespaceMIO,
            otherUserNamespaceMIO;

        beforeEach(() => {
            const namespaceMIOs = {};
            mcws.namespace.and.callFake((namespaceUrl) => namespaceMIOs[namespaceUrl]);
            
            userRootNamespaceMIO =
                namespaceMIOs['/some/personal/namespace'] =
                jasmine.createSpyObj(
                    'userNamespace',
                    ['read', 'create']
                );
            userRootNamespaceMIO.read.and.returnValue(Promise.resolve([]));

            userNamespaceMIO =
                namespaceMIOs['/some/personal/namespace/someUser'] =
                jasmine.createSpyObj(
                    'userNamespaceMIO',
                    ['read', 'create']
                );
            userNamespaceMIO.read.and.returnValue(Promise.resolve([]));

            otherUserNamespaceMIO =
                namespaceMIOs['/some/personal/namespace/otherUser'] =
                jasmine.createSpyObj(
                    'otherUserNamespace',
                    ['read', 'create']
                );

            otherUserNamespaceMIO.read.and.returnValue(Promise.resolve([]));
        });

        function expectCurrentUserDefinition(definition) {
            expect(definition.id).toBe('personal-someUser:root');
            expect(definition.key).toBe('personal-someUser');
            expect(definition.name).toBe('someUser');
            expect(definition.url).toBe('/some/personal/namespace/someUser');
            expect(definition.location).toBe('personal');
        };

        function expectOtherUserDefinition(definition) {
            expect(definition.id).toBe('personal-otherUser:root');
            expect(definition.key).toBe('personal-otherUser');
            expect(definition.name).toBe('otherUser');
            expect(definition.url).toBe('/some/personal/namespace/otherUser');
            expect(definition.location).toBe('personal');
        };

        it('returns contents with current user first', async () => {
            userRootNamespaceMIO.read.and.returnValue(Promise.resolve([
                {
                    object: 'namespace',
                    subject: '/some/personal/namespace/otherUser'
                },
                {
                    object: 'namespace',
                    subject: '/some/personal/namespace/someUser'
                }
            ]));

            const contents = await mcwsUserContainerProvider.getContainedNamespaces(containerRootDefinition);
            expect(userNamespaceMIO.create).not.toHaveBeenCalled();
            expect(otherUserNamespaceMIO.create).not.toHaveBeenCalled();

            expect(contents.length).toBe(2);
            expectCurrentUserDefinition(contents[0]);
            expectOtherUserDefinition(contents[1]);
        });

        it('creates user if missing', async () => {
            userRootNamespaceMIO.read.and.returnValue(Promise.resolve([]));
            userNamespaceMIO.read.and.returnValue(Promise.reject({status: 404}));
            userNamespaceMIO.create.and.returnValue(Promise.resolve([]));

            const contents = await mcwsUserContainerProvider.getContainedNamespaces(containerRootDefinition);
            expect(contents.length).toBe(1);
            expect(userNamespaceMIO.create).toHaveBeenCalled();
            expectCurrentUserDefinition(contents[0]);
        });
    });

    // need to fix this (issue is mocking window.location.pathname)
    xdescribe('namespace filtering', () => {
        let smapDefinition;
        let mslDefinition;
        let ammosDefinition;
        let filterDefinitions;
        let filterPath = '/mcws/clients/vista/';
        let filterTerm = 'vista';

        beforeEach(() => {
            spyOn(String.prototype, 'startsWith').and.callFake(function(searchString) {
                if (searchString.includes('/') && searchString === filterPath) {
                    return true;
                } else if (searchString.includes(filterTerm)) {
                    return true;
                }
                return false;
            });

            smapDefinition = {
                key: 'smap-thing',
                url: '/path/to/smap-namespace'
            };
            mslDefinition = {
                key: 'msl-thing',
                url: '/path/to/msl-namespace'
            };
            ammosDefinition = {
                key: 'ammos-thing',
                url: '/path/to/ammos-namespace'
            };
            filterDefinitions = [
                smapDefinition,
                mslDefinition,
                ammosDefinition
            ];

            mcwsPersistenceProvider = new MCWSPersistenceProvider(
                mockOpenmct,
                filterDefinitions
            );
        });

        afterEach(() => {
            String.prototype.startsWith.and.callThrough();
        });

        it('does not filter with default path', async () => {
            const namespaces = await mcwsPersistenceProvider.getRootNamespaces();
            expect(namespaces).toEqual(filterDefinitions);
        });

        it('only includes smap with smap-path', async () => {
            filterPath = '/mcws/clients/vista-smap';
            filterTerm = 'smap';
            const namespaces = await mcwsPersistenceProvider.getRootNamespaces();
            expect(namespaces).toEqual([smapDefinition]);
        });

        it('only includes msl with msl-path', async () => {
            filterPath = '/mcws/clients/vista-msl';
            filterTerm = 'msl';
            const namespaces = await mcwsPersistenceProvider.getRootNamespaces();
            expect(namespaces).toEqual([mslDefinition]);
        });

        it('only includes ammos with ammos-path', async () => {
            filterPath = '/mcws/clients/vista-ammos';
            filterTerm = 'ammos';
            const namespaces = await mcwsPersistenceProvider.getRootNamespaces();
            expect(namespaces).toEqual([ammosDefinition]);
        });
    });
});
