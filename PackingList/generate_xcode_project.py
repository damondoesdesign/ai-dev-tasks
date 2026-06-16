#!/usr/bin/env python3
"""Generate PackingList.xcodeproj/project.pbxproj for the iOS app."""

import uuid
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(ROOT)
APP = os.path.join(ROOT, "PackingList")
TESTS = os.path.join(ROOT, "PackingListTests")

SOURCE_FILES = []
for dirpath, _, filenames in os.walk(APP):
    for f in sorted(filenames):
        if f.endswith(".swift"):
            rel = os.path.relpath(os.path.join(dirpath, f), ROOT)
            SOURCE_FILES.append(rel)

TEST_FILES = []
if os.path.isdir(TESTS):
    for f in sorted(os.listdir(TESTS)):
        if f.endswith(".swift"):
            TEST_FILES.append(os.path.join("PackingListTests", f))


def uid():
    return uuid.uuid4().hex[:24].upper()


# Fixed IDs for stability across regenerations would be nice; generate once per run is ok for dev
ids = {k: uid() for k in [
    "project", "main_target", "test_target", "app_product", "test_product",
    "sources_phase", "frameworks_phase", "resources_phase", "test_sources_phase",
    "build_config_list_project", "build_config_list_target", "build_config_list_test",
    "debug_project", "release_project", "debug_target", "release_target",
    "debug_test", "release_test", "package_ref", "package_product",
]}

file_refs = {}
build_files = {}
for path in SOURCE_FILES + TEST_FILES:
    file_refs[path] = uid()
    if path in SOURCE_FILES:
        build_files[path] = uid()

pbx = f'''// !$*UTF8*$!
{{
\tarchiveVersion = 1;
\tclasses = {{
\t}};
\tobjectVersion = 56;
\tobjects = {{

/* Begin PBXBuildFile section */
'''
for path in SOURCE_FILES:
    pbx += f'\t\t{build_files[path]} /* {os.path.basename(path)} in Sources */ = {{isa = PBXBuildFile; fileRef = {file_refs[path]} /* {os.path.basename(path)} */; }};\n'
for path in TEST_FILES:
    pbx += f'\t\t{build_files.get(path, uid())} /* {os.path.basename(path)} in Sources */ = {{isa = PBXBuildFile; fileRef = {file_refs[path]} /* {os.path.basename(path)} */; }};\n'
    if path not in build_files:
        build_files[path] = uid()

pbx += f'\t\t{ids["package_product"]} /* PackingListCore in Frameworks */ = {{isa = PBXBuildFile; productRef = {ids["package_product"]}_PROD /* PackingListCore */; }};\n'
pbx += '''/* End PBXBuildFile section */

/* Begin PBXFileReference section */
'''
pbx += f'\t\t{ids["app_product"]} /* PackingList.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = PackingList.app; sourceTree = BUILT_PRODUCTS_DIR; }};\n'
pbx += f'\t\t{ids["test_product"]} /* PackingListTests.xctest */ = {{isa = PBXFileReference; explicitFileType = wrapper.cfbundle; includeInIndex = 0; path = PackingListTests.xctest; sourceTree = BUILT_PRODUCTS_DIR; }};\n'
for path in SOURCE_FILES + TEST_FILES:
    pbx += f'\t\t{file_refs[path]} /* {os.path.basename(path)} */ = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = {os.path.basename(path)}; sourceTree = "<group>"; }};\n'

pbx += '''/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
'''
pbx += f'\t\t{ids["frameworks_phase"]} /* Frameworks */ = {{\n\t\t\tisa = PBXFrameworksBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n\t\t\t\t{ids["package_product"]} /* PackingListCore in Frameworks */,\n\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t}};\n'
pbx += '''/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
'''
pbx += f'\t\t{uid()} = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n'
for path in SOURCE_FILES:
    pbx += f'\t\t\t\t{file_refs[path]} /* {os.path.basename(path)} */,\n'
pbx += f'\t\t\t);\n\t\t\tpath = PackingList;\n\t\t\tsourceTree = "<group>";\n\t\t}};\n'
APP_GROUP = list(file_refs.values())[0]  # placeholder

groups = {}
def group_for(prefix):
    key = prefix
    if key not in groups:
        groups[key] = uid()
    return groups[key]

# Build folder groups from paths
folder_groups = {"": uid()}
children_root = [folder_groups[""]]

def ensure_folder(rel_dir):
    if rel_dir in folder_groups:
        return folder_groups[rel_dir]
    parts = rel_dir.split(os.sep)
    current = ""
    parent_id = folder_groups[""]
    for part in parts:
        current = part if not current else f"{current}{os.sep}{part}"
        if current not in folder_groups:
            folder_groups[current] = uid()
        folder_groups[current]
    return folder_groups[rel_dir]

# Simpler: flat groups under PackingList and PackingListTests
pbx = pbx.split('/* Begin PBXGroup section */')[0] + '/* Begin PBXGroup section */\n'

main_group = uid()
app_group = uid()
test_group = uid()
products_group = uid()

pbx += f'\t\t{main_group} = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n\t\t\t\t{app_group} /* PackingList */,\n\t\t\t\t{test_group} /* PackingListTests */,\n\t\t\t\t{products_group} /* Products */,\n\t\t\t);\n\t\t\tsourceTree = "<group>";\n\t\t}};\n'
pbx += f'\t\t{products_group} /* Products */ = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n\t\t\t\t{ids["app_product"]} /* PackingList.app */,\n\t\t\t\t{ids["test_product"]} /* PackingListTests.xctest */,\n\t\t\t);\n\t\t\tname = Products;\n\t\t\tsourceTree = "<group>";\n\t\t}};\n'

pbx += f'\t\t{app_group} /* PackingList */ = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n'
for path in SOURCE_FILES:
    pbx += f'\t\t\t\t{file_refs[path]} /* {os.path.basename(path)} */,\n'
pbx += f'\t\t\t);\n\t\t\tpath = PackingList;\n\t\t\tsourceTree = "<group>";\n\t\t}};\n'

pbx += f'\t\t{test_group} /* PackingListTests */ = {{\n\t\t\tisa = PBXGroup;\n\t\t\tchildren = (\n'
for path in TEST_FILES:
    pbx += f'\t\t\t\t{file_refs[path]} /* {os.path.basename(path)} */,\n'
pbx += f'\t\t\t);\n\t\t\tpath = PackingListTests;\n\t\t\tsourceTree = "<group>";\n\t\t}};\n'

pbx += '''/* End PBXGroup section */

/* Begin PBXNativeTarget section */
'''
pbx += f'''\t\t{ids["main_target"]} /* PackingList */ = {{
\t\t\tisa = PBXNativeTarget;
\t\t\tbuildConfigurationList = {ids["build_config_list_target"]} /* Build configuration list for PBXNativeTarget "PackingList" */;
\t\t\tbuildPhases = (
\t\t\t\t{ids["sources_phase"]} /* Sources */,
\t\t\t\t{ids["frameworks_phase"]} /* Frameworks */,
\t\t\t\t{ids["resources_phase"]} /* Resources */,
\t\t\t);
\t\t\tbuildRules = (
\t\t\t);
\t\t\tdependencies = (
\t\t\t);
\t\t\tname = PackingList;
\t\t\tpackageProductDependencies = (
\t\t\t\t{ids["package_product"]}_PROD /* PackingListCore */,
\t\t\t);
\t\t\tproductName = PackingList;
\t\t\tproductReference = {ids["app_product"]} /* PackingList.app */;
\t\t\tproductType = "com.apple.product-type.application";
\t\t}};
'''
pbx += f'''\t\t{ids["test_target"]} /* PackingListTests */ = {{
\t\t\tisa = PBXNativeTarget;
\t\t\tbuildConfigurationList = {ids["build_config_list_test"]} /* Build configuration list for PBXNativeTarget "PackingListTests" */;
\t\t\tbuildPhases = (
\t\t\t\t{ids["test_sources_phase"]} /* Sources */,
\t\t\t);
\t\t\tbuildRules = (
\t\t\t);
\t\t\tdependencies = (
\t\t\t);
\t\t\tname = PackingListTests;
\t\t\tproductName = PackingListTests;
\t\t\tproductReference = {ids["test_product"]} /* PackingListTests.xctest */;
\t\t\tproductType = "com.apple.product-type.bundle.unit-test";
\t\t}};
'''
pbx += '''/* End PBXNativeTarget section */

/* Begin PBXProject section */
'''
pbx += f'''\t\t{ids["project"]} /* Project object */ = {{
\t\t\tisa = PBXProject;
\t\t\tattributes = {{
\t\t\t\tBuildIndependentTargetsInParallel = 1;
\t\t\t\tLastSwiftUpdateCheck = 1500;
\t\t\t\tLastUpgradeCheck = 1500;
\t\t\t\tTargetAttributes = {{
\t\t\t\t\t{ids["main_target"]} = {{
\t\t\t\t\t\tCreatedOnToolsVersion = 15.0;
\t\t\t\t\t}};
\t\t\t\t}};
\t\t\t}};
\t\t\tbuildConfigurationList = {ids["build_config_list_project"]} /* Build configuration list for PBXProject "PackingList" */;
\t\t\tcompatibilityVersion = "Xcode 14.0";
\t\t\tdevelopmentRegion = en;
\t\t\thasScannedForEncodings = 0;
\t\t\tknownRegions = (
\t\t\t\ten,
\t\t\t\tBase,
\t\t\t);
\t\t\tmainGroup = {main_group};
\t\t\tpackageReferences = (
\t\t\t\t{ids["package_ref"]} /* XCLocalSwiftPackageReference "PackingListCore" */,
\t\t\t);
\t\t\tproductRefGroup = {products_group} /* Products */;
\t\t\tprojectDirPath = "";
\t\t\tprojectRoot = "";
\t\t\ttargets = (
\t\t\t\t{ids["main_target"]} /* PackingList */,
\t\t\t\t{ids["test_target"]} /* PackingListTests */,
\t\t\t);
\t\t}};
'''
pbx += '''/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
'''
pbx += f'\t\t{ids["resources_phase"]} /* Resources */ = {{\n\t\t\tisa = PBXResourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t}};\n'
pbx += '''/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
'''
pbx += f'\t\t{ids["sources_phase"]} /* Sources */ = {{\n\t\t\tisa = PBXSourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n'
for path in SOURCE_FILES:
    pbx += f'\t\t\t\t{build_files[path]} /* {os.path.basename(path)} in Sources */,\n'
pbx += f'\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t}};\n'
pbx += f'\t\t{ids["test_sources_phase"]} /* Sources */ = {{\n\t\t\tisa = PBXSourcesBuildPhase;\n\t\t\tbuildActionMask = 2147483647;\n\t\t\tfiles = (\n'
for path in TEST_FILES:
    bf = build_files.get(path)
    if not bf:
        bf = uid()
        build_files[path] = bf
    pbx += f'\t\t\t\t{bf} /* {os.path.basename(path)} in Sources */,\n'
pbx += f'\t\t\t);\n\t\t\trunOnlyForDeploymentPostprocessing = 0;\n\t\t}};\n'
pbx += '''/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
'''

def configs():
    for name, level, bid in [
        ("Debug", "project", ids["debug_project"]),
        ("Release", "project", ids["release_project"]),
        ("Debug", "target", ids["debug_target"]),
        ("Release", "target", ids["release_target"]),
        ("Debug", "test", ids["debug_test"]),
        ("Release", "test", ids["release_test"]),
    ]:
        is_project = level == "project"
        is_test = level == "test"
        swift_version = "SWIFT_VERSION = 5.9;"
        if is_project:
            settings = f'''
\t\t\tbuildSettings = {{
\t\t\t\tALWAYS_SEARCH_USER_PATHS = NO;
\t\t\t\tCLANG_ENABLE_MODULES = YES;
\t\t\t\tDEBUG_INFORMATION_FORMAT = dwarf;
\t\t\t\tENABLE_TESTABILITY = YES;
\t\t\t\tGCC_DYNAMIC_NO_PIC = NO;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tONLY_ACTIVE_ARCH = YES;
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\t{swift_version}
\t\t\t}};
\t\t\tname = {name};'''
        elif is_test:
            settings = f'''
\t\t\tbuildSettings = {{
\t\t\t\tBUNDLE_LOADER = "$(TEST_HOST)";
\t\t\t\tGENERATE_INFOPLIST_FILE = YES;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.packinglist.app.tests;
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\t{swift_version}
\t\t\t\tTARGETED_DEVICE_FAMILY = 1;
\t\t\t\tTEST_HOST = "$(BUILT_PRODUCTS_DIR)/PackingList.app/$(BUNDLE_EXECUTABLE_FOLDER_PATH)/PackingList";
\t\t\t}};
\t\t\tname = {name};'''
        else:
            settings = f'''
\t\t\tbuildSettings = {{
\t\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\t\tDEVELOPMENT_ASSET_PATHS = "";
\t\t\t\tENABLE_PREVIEWS = YES;
\t\t\t\tGENERATE_INFOPLIST_FILE = YES;
\t\t\t\tINFOPLIST_KEY_UIApplicationSceneManifest_Generation = YES;
\t\t\t\tINFOPLIST_KEY_UILaunchScreen_Generation = YES;
\t\t\t\tINFOPLIST_KEY_UISupportedInterfaceOrientations = UIInterfaceOrientationPortrait;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = 17.0;
\t\t\t\tLD_RUNPATH_SEARCH_PATHS = (
\t\t\t\t\t"$(inherited)",
\t\t\t\t\t"@executable_path/Frameworks",
\t\t\t\t);
\t\t\t\tMARKETING_VERSION = 1.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = com.packinglist.app;
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\t{swift_version}
\t\t\t\tSUPPORTED_PLATFORMS = "iphoneos iphonesimulator";
\t\t\t\tTARGETED_DEVICE_FAMILY = 1;
\t\t\t}};
\t\t\tname = {name};'''
        yield bid, settings

for bid, settings in configs():
    pbx += f'\t\t{bid} /* {"Debug" if "Debug" in settings else "Release"} */ = {{isa = XCBuildConfiguration;{settings}\n\t\t}};\n'

pbx += '''/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
'''
for list_id, name, children in [
    (ids["build_config_list_project"], "PackingList project", [ids["debug_project"], ids["release_project"]]),
    (ids["build_config_list_target"], "PackingList target", [ids["debug_target"], ids["release_target"]]),
    (ids["build_config_list_test"], "PackingListTests target", [ids["debug_test"], ids["release_test"]]),
]:
    pbx += f'\t\t{list_id} /* Build configuration list for PBXNativeTarget "{name}" */ = {{\n\t\t\tisa = XCConfigurationList;\n\t\t\tbuildConfigurations = (\n'
    for c in children:
        pbx += f'\t\t\t\t{c} /* {"Debug" if c.endswith(tuple([ids["debug_project"], ids["debug_target"], ids["debug_test"]])) else "Release"} */,\n'
    pbx += f'\t\t\t);\n\t\t\tdefaultConfigurationIsVisible = 0;\n\t\t\tdefaultConfigurationName = Release;\n\t\t}};\n'

pbx += '''/* End XCConfigurationList section */

/* Begin XCLocalSwiftPackageReference section */
'''
pbx += f'\t\t{ids["package_ref"]} /* XCLocalSwiftPackageReference "PackingListCore" */ = {{\n\t\t\tisa = XCLocalSwiftPackageReference;\n\t\t\trelativePath = ../PackingListCore;\n\t\t}};\n'
pbx += '''/* End XCLocalSwiftPackageReference section */

/* Begin XCSwiftPackageProductDependency section */
'''
pbx += f'\t\t{ids["package_product"]}_PROD /* PackingListCore */ = {{\n\t\t\tisa = XCSwiftPackageProductDependency;\n\t\t\tproductName = PackingListCore;\n\t\t\tpackage = {ids["package_ref"]} /* XCLocalSwiftPackageReference "PackingListCore" */;\n\t\t}};\n'
pbx += '''/* End XCSwiftPackageProductDependency section */
\t};
\trootObject = ''' + ids["project"] + ''' /* Project object */;
}
'''

out_dir = os.path.join(ROOT, "PackingList.xcodeproj")
os.makedirs(out_dir, exist_ok=True)
with open(os.path.join(out_dir, "project.pbxproj"), "w") as f:
    f.write(pbx)
print(f"Generated project with {len(SOURCE_FILES)} source files")
