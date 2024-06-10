import BaseIcon, { BaseIconProps, PathStyle } from './BaseIcon';
import { ignoreKeys } from '@utils/hash';
import * as icons from './constants';

export function build(
  arrayOfPathProps,
  iconProps: {
    fill?: string;
    useStroke?: boolean;
    viewBox?: string;
  } = {},
  opts?: {
    withoutBaseIcon?: boolean;
  },
) {
  return ({ ...props }: BaseIconProps) => {
    const arr = arrayOfPathProps.map(({ Style, ...pathProps }, idx) => {
      let itemProps = {
        ...props,
        ...pathProps,
      };

      if (pathProps?.fill) {
        itemProps = ignoreKeys(itemProps, [
          'active',
          'black',
          'danger',
          'default',
          'disabled',
          'earth',
          'highlight',
          'inverted',
          'neutral',
          'muted',
          'pink',
          'primary',
          'secondary',
          'success',
          'warning',
        ]);
      }

      return Style ? (
        <Style useStroke={iconProps?.useStroke} {...itemProps} key={idx} />
      ) : (
        <PathStyle useStroke={iconProps?.useStroke} {...itemProps} key={idx} />
      );
    });

    if (opts?.withoutBaseIcon) {
      return arr;
    }

    return (
      <BaseIcon {...props} {...iconProps}>
        {arr}
      </BaseIcon>
    );
  };
}

const mapping: {
  [key: string]: any;
} = Object.entries(icons).reduce(
  (acc, [key, value]) => ({
    ...acc,
    [key]: build(...value),
  }),
  {},
);

export const Action = mapping.Action;
export const Add = mapping.Add;
export const AISparkle = mapping.AISparkle;
export const AlertCircle = mapping.AlertCircle;
export const AlertTriangle = mapping.AlertTriangle;
export const Alphabet = mapping.Alphabet;
export const ArrowDown = mapping.ArrowDown;
export const ArrowDownSplitTwo = mapping.ArrowDownSplitTwo;
export const ArrowLeft = mapping.ArrowLeft;
export const ArrowRight = mapping.ArrowRight;
export const ArrowsAdjustingFrameSquare = mapping.ArrowsAdjustingFrameSquare;
export const ArrowUp = mapping.ArrowUp;
export const Backfill = mapping.Backfill;
export const BackfillV2 = mapping.BackfillV2;
export const BatchPipeline = mapping.BatchPipeline;
export const Binary = mapping.Binary;
export const BlockBlank = mapping.BlockBlank;
export const BlockCubePolygon = mapping.BlockCubePolygon;
export const BlockGeneric = mapping.BlockGeneric;
export const BlocksSeparated = mapping.BlocksSeparated;
export const BlocksStacked = mapping.BlocksStacked;
export const Branch = mapping.Branch;
export const BranchAlt = mapping.BranchAlt;
export const CalendarDate = mapping.CalendarDate;
export const CalendarRounded = mapping.CalendarRounded;
export const Callback = mapping.Callback;
export const CaretDown = mapping.CaretDown;
export const CaretRight = mapping.CaretRight;
export const Category = mapping.Category;
export const Categories = mapping.Categories;
export const Chart = mapping.Chart;
export const Charts = mapping.Charts;
export const Chat = mapping.Chat;
export const Check = mapping.Check;
export const ChevronDown = mapping.ChevronDown;
export const ChevronLeft = mapping.ChevronLeft;
export const ChevronRight = mapping.ChevronRight;
export const ChevronUp = mapping.ChevronUp;
export const Circle = mapping.Circle;
export const CircleWithArrowUp = mapping.CircleWithArrowUp;
export const Clone = mapping.Clone;
export const Close = mapping.Close;
export const Code = mapping.Code;
export const Column = mapping.Column;
export const Conditional = mapping.Conditional;
export const Copy = mapping.Copy;
export const CubeWithArrowDown = mapping.CubeWithArrowDown;
export const Cursor = mapping.Cursor;
export const DBT = mapping.DBT;
export const DevOpsWithText = mapping.DevOpsWithText;
export const DiamondDetached = mapping.DiamondDetached;
export const DiamondShared = mapping.DiamondShared;
export const DocumentIcon = mapping.DocumentIcon;
export const Edit = mapping.Edit;
export const Ellipsis = mapping.Ellipsis;
export const Email = mapping.Email;
export const Expand = mapping.Expand;
export const File = mapping.File;
export const FileFill = mapping.FileFill;
export const Filter = mapping.Filter;
export const FilterV2 = mapping.FilterV2;
export const Folder = mapping.Folder;
export const FrameBoxSelection = mapping.FrameBoxSelection;
export const GitHubIcon = mapping.GitHubIcon;
export const GitHubWithTextIcon = mapping.GitHubWithTextIcon;
export const GitLabWithTextIcon = mapping.GitLabWithTextIcon;
export const GoogleIcon = mapping.GoogleIcon;
export const Graph = mapping.Graph;
export const GraphWithNodes = mapping.GraphWithNodes;
export const Group = mapping.Group;
export const HexagonAll = mapping.HexagonAll;
export const IDLetters = mapping.IDLetters;
export const Info = mapping.Info;
export const Input = mapping.Input;
export const Insights = mapping.Insights;
export const IntegrationPipeline = mapping.IntegrationPipeline;
export const Lightning = mapping.Lightning;
export const LightningOff = mapping.LightningOff;
export const List = mapping.List;
export const Locked = mapping.Locked;
export const Logs = mapping.Logs;
export const MapPin = mapping.MapPin;
export const Menu = mapping.Menu;
export const MicrosoftIcon = mapping.MicrosoftIcon;
export const Monitor = mapping.Monitor;
export const MultiShare = mapping.MultiShare;
export const MusicNotes = mapping.MusicNotes;
export const NavDashboard = mapping.NavDashboard;
export const NavData = mapping.NavData;
export const NavGraph = mapping.NavGraph;
export const NavReport = mapping.NavReport;
export const NavTree = mapping.NavTree;
export const NewBlock = mapping.NewBlock;
export const NumberHash = mapping.NumberHash;
export const NumberWithDecimalHash = mapping.NumberWithDecimalHash;
export const Once = mapping.Once;
export const Open = mapping.Open;
export const PaginateArrowLeft = mapping.PaginateArrowLeft;
export const PaginateArrowRight = mapping.PaginateArrowRight;
export const ParentEmpty = mapping.ParentEmpty;
export const ParentLinked = mapping.ParentLinked;
export const Pause = mapping.Pause;
export const Phone = mapping.Phone;
export const PipeIcon = mapping.PipeIcon;
export const Pipeline = mapping.Pipeline;
export const PipelineV2 = mapping.PipelineV2;
export const PipelineV3 = mapping.PipelineV3;
export const PlayButton = mapping.PlayButton;
export const PlayButtonFilled = mapping.PlayButtonFilled;
export const PlugAPI = mapping.PlugAPI;
export const PowerUps = mapping.PowerUps;
export const PreviewHidden = mapping.PreviewHidden;
export const PreviewOpen = mapping.PreviewOpen;
export const Refresh = mapping.Refresh;
export const RoundedSquare = mapping.RoundedSquare;
export const Save = mapping.Save;
export const Schedule = mapping.Schedule;
export const Search = mapping.Search;
export const Secrets = mapping.Secrets;
export const Sensor = mapping.Sensor;
export const Settings = mapping.Settings;
export const SettingsWithKnobs = mapping.SettingsWithKnobs;
export const Slack = mapping.Slack;
export const Smiley = mapping.Smiley;
export const SortDescending = mapping.SortDescending;
export const SortAscending = mapping.SortAscending;
export const Stack = mapping.Stack;
export const StreamingPipeline = mapping.StreamingPipeline;
export const Subitem = mapping.Subitem;
export const Sun = mapping.Sun;
export const Switch = mapping.Switch;
export const Table = mapping.Table;
export const TemplateShapes = mapping.TemplateShapes;
export const Terminal = mapping.Terminal;
export const TodoList = mapping.TodoList;
export const Trash = mapping.Trash;
export const Tree = mapping.Tree;
export const Union = mapping.Union;
export const Upload = mapping.Upload;
export const Variables = mapping.Variables;
export const WeekDots = mapping.WeekDots;
export const WorkspacesIcon = mapping.WorkspacesIcon;
export const WorkspacesUsersIcon = mapping.WorkspacesUsersIcon;
export const Interactions = mapping.Interactions;
export const AddUserSmileyFace = mapping.AddUserSmileyFace;
export const VisibleEye = mapping.VisibleEye;
export const PowerOnOffButton = mapping.PowerOnOffButton;
export const TripleBoxes = mapping.TripleBoxes;
export const LayoutStacked = mapping.LayoutStacked;
export const LayoutSplit = mapping.LayoutSplit;
export const Recenter = mapping.Recenter;
export const ZoomIn = mapping.ZoomIn;
export const ZoomOut = mapping.ZoomOut;
export const DiamondGem = mapping.DiamondGem;
export const CubesThreeSeparated = mapping.CubesThreeSeparated;
export const ExpandOpenUpRight = mapping.ExpandOpenUpRight;
export const UserSmileyFace = mapping.UserSmileyFace;
export const FolderV2 = mapping.FolderV2;
export const FolderV2Filled = mapping.FolderV2Filled;
export const Database = mapping.Database;
export const FolderOutline = mapping.FolderOutline;
export const BatchSquaresStacked = mapping.BatchSquaresStacked;
export const AddBlock = mapping.AddBlock;
export const PauseV2 = mapping.PauseV2;
export const ChevronDownV2 = mapping.ChevronDownV2;
export const ChevronUpV2 = mapping.ChevronUpV2;
export const BlocksCombined = mapping.BlocksCombined;
export const TreeWithArrowsDown = mapping.TreeWithArrowsDown;
export const TreeWithArrowsUp = mapping.TreeWithArrowsUp;
export const PanelCollapseRight = mapping.PanelCollapseRight;
export const PanelCollapseLeft = mapping.PanelCollapseLeft;
export const ScheduleClockWithBorderDots = mapping.ScheduleClockWithBorderDots;
export const MageMLogo = mapping.MageMLogo;
export const ChurnV3 = mapping.ChurnV3;
export const ForecastV3 = mapping.ForecastV3;
export const LTVUseCase = mapping.LTVUseCase;
export const RankingV3 = mapping.RankingV3;
export const CategorizationUseCase = mapping.CategorizationUseCase;
export const EstimationUseCase = mapping.EstimationUseCase;
export const VersionControlRebase = mapping.VersionControlRebase;
export const VersionControlMerge = mapping.VersionControlMerge;
export const VersionControlFetch = mapping.VersionControlFetch;
export const CloseV2 = mapping.CloseV2;
export const Minimize = mapping.Minimize;
export const ArrowsPointingInFromAllCorners = mapping.ArrowsPointingInFromAllCorners;
export const ExpandWindow = mapping.ExpandWindow;
export const ExpandWindowFilled = mapping.ExpandWindowFilled;
export const CollapseWindow = mapping.CollapseWindow;
export const CollapseWindowFilled = mapping.CollapseWindowFilled;
export const CloseWindow = mapping.CloseWindow;
export const CloseWindowFilled = mapping.CloseWindowFilled;
export const Planet = mapping.Planet;
export const UFO = mapping.UFO;
